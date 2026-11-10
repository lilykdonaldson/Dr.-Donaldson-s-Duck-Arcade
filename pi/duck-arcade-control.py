#!/usr/bin/python3
"""Root-owned, fixed-action helper. Called only by the maintenance service via sudo."""
import ipaddress
import json
import os
import socket
import subprocess
import sys
import time
import uuid

NM = 'org.freedesktop.NetworkManager'
BASE = '/org/freedesktop/NetworkManager'

def command(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True, timeout=15).stdout.strip()

def manager():
    import dbus
    bus = dbus.SystemBus()
    obj = bus.get_object(NM, BASE)
    return dbus, bus, dbus.Interface(obj, NM), dbus.Interface(obj, 'org.freedesktop.DBus.Properties')

def wireless():
    dbus, bus, nm, props = manager()
    for device in nm.GetDevices():
        obj = bus.get_object(NM, device)
        properties = dbus.Interface(obj, 'org.freedesktop.DBus.Properties')
        if int(properties.Get(NM + '.Device', 'DeviceType')) == 2:
            return dbus, bus, nm, props, device, dbus.Interface(obj, NM + '.Device.Wireless')
    raise ValueError('No Wi-Fi adapter found. Check rfkill, the Wi-Fi country setting, or use Ethernet and SSH.')

def status():
    dbus, bus, nm, props = manager()
    addresses, names = [], []
    for active in props.Get(NM, 'ActiveConnections'):
        obj = bus.get_object(NM, active)
        p = dbus.Interface(obj, 'org.freedesktop.DBus.Properties')
        names.append(str(p.Get(NM + '.Connection.Active', 'Id')))
        for kind in ['Ip4Config', 'Ip6Config']:
            config = str(p.Get(NM + '.Connection.Active', kind))
            if config == '/':
                continue
            cp = dbus.Interface(bus.get_object(NM, config), 'org.freedesktop.DBus.Properties')
            for address in cp.Get(NM + ('.IP4Config' if kind == 'Ip4Config' else '.IP6Config'), 'AddressData'):
                value = str(address['address'])
                if not ipaddress.ip_address(value).is_link_local:
                    addresses.append(value)
    dns, internet = False, False
    try:
        socket.getaddrinfo('github.com', 443)
        dns = True
        with socket.create_connection(('github.com', 443), timeout=3):
            internet = True
    except OSError:
        pass
    version = 'unknown'
    try:
        with open('/opt/duck-arcade/current/.release.json') as f:
            version = json.load(f)['version']
    except (OSError, ValueError, KeyError):
        pass
    update = {}
    try:
        with open('/var/lib/duck-arcade/update-state/status.json') as f:
            update = json.load(f)
    except (OSError, ValueError):
        pass
    with open('/proc/uptime') as f:
        seconds = int(float(f.read().split()[0]))
    return dict(hostname=socket.gethostname(), uptime=f'{seconds // 3600}h {(seconds // 60) % 60}m',
                version=version, wifiEnabled=bool(props.Get(NM, 'WirelessEnabled')),
                connection=', '.join(names), addresses=addresses, dns=dns, internet=internet, update=update)

def scan():
    dbus, bus, nm, props, device, wifi = wireless()
    try:
        wifi.RequestScan({})
        time.sleep(2)
    except dbus.DBusException:
        pass  # NetworkManager may already be scanning; use its current results.
    networks = {}
    for ap in wifi.GetAccessPoints():
        p = dbus.Interface(bus.get_object(NM, ap), 'org.freedesktop.DBus.Properties')
        fields = p.GetAll(NM + '.AccessPoint')
        ssid = bytes(fields['Ssid']).decode('utf-8', 'replace')
        if not ssid:
            continue
        security = 'secured' if int(fields['Flags']) & 1 or int(fields['RsnFlags']) or int(fields['WpaFlags']) else 'open'
        network = dict(ssid=ssid, signal=int(fields['Strength']), security=security)
        if ssid not in networks or network['signal'] > networks[ssid]['signal']:
            networks[ssid] = network
    return sorted(networks.values(), key=lambda n: -n['signal'])

def connect(data):
    dbus, bus, nm, props, device, wifi = wireless()
    ssid, password = data.get('ssid'), data.get('password', '')
    if not isinstance(ssid, str) or not 1 <= len(ssid.encode('utf-8')) <= 32 or '\x00' in ssid:
        raise ValueError('SSID must be between 1 and 32 bytes.')
    if not isinstance(password, str) or (password and not 8 <= len(password) <= 63) or '\x00' in password:
        raise ValueError('A personal-network password must contain 8–63 characters.')
    # D-Bus carries the password; it never appears in shell arguments or logs.
    settings = {
        'connection': {'id': ssid, 'uuid': str(uuid.uuid4()), 'type': '802-11-wireless', 'autoconnect': True},
        '802-11-wireless': {'ssid': dbus.ByteArray(ssid.encode('utf-8')), 'mode': 'infrastructure'},
        'ipv4': {'method': 'auto'}, 'ipv6': {'method': 'auto'}
    }
    if password:
        settings['802-11-wireless']['security'] = '802-11-wireless-security'
        settings['802-11-wireless-security'] = {'key-mgmt': 'wpa-psk', 'psk': password}
    nm.AddAndActivateConnection(settings, device, dbus.ObjectPath('/'))
    return {'message': 'NetworkManager is activating the connection.'}

def main():
    if os.geteuid() != 0:
        raise ValueError('This helper must be invoked through its installed sudo rule.')
    if len(sys.argv) != 2:
        raise ValueError('Exactly one action is required.')
    action = sys.argv[1]
    if action not in ['status', 'scan', 'connect', 'enable-wifi', 'update', 'rollback', 'reboot', 'shutdown']:
        raise ValueError('Unsupported device action.')
    data = json.loads(sys.stdin.read(8193) or '{}')
    if not isinstance(data, dict):
        raise ValueError('Invalid action data.')
    if action == 'status':
        return status()
    if action == 'scan':
        return scan()
    if action == 'connect':
        return connect(data)
    if action == 'enable-wifi':
        dbus, bus, nm, props = manager()
        props.Set(NM, 'WirelessEnabled', dbus.Boolean(True))
        return {'message': 'Wi-Fi enabled.'}
    if action in ['update', 'rollback']:
        unit = 'duck-arcade-update.service' if action == 'update' else 'duck-arcade-rollback.service'
        # Both units share a file lock in the updater.
        command('/usr/bin/systemctl', 'start', '--no-block', unit)
        return {'message': 'Requested ' + action}
    if data.get('confirm') != action:
        raise ValueError('Power action must be confirmed.')
    # Delay allows the HTTP response to reach the panel before the service stops.
    command('/usr/bin/systemd-run', '--quiet', '--on-active=3s', '/usr/bin/systemctl', 'reboot' if action == 'reboot' else 'poweroff')
    return {'message': 'Power action scheduled.'}

if __name__ == '__main__':
    try:
        print(json.dumps({'ok': True, 'data': main()}))
    except Exception as error:
        # Do not include subprocess arguments, connection settings, or passwords.
        print(json.dumps({'ok': False, 'error': str(error) if isinstance(error, ValueError) else 'Device operation failed. Check NetworkManager and service logs over SSH.'}))
        sys.exit(1)
