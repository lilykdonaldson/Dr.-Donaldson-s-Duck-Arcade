import importlib.util
import io
import pathlib
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('pi_control', pathlib.Path(__file__).parents[1] / 'pi' / 'duck-arcade-control.py')
control = importlib.util.module_from_spec(spec)
spec.loader.exec_module(control)

class DeviceHelperTests(unittest.TestCase):
    def invoke(self, action, data='{}'):
        with patch.object(control.os, 'geteuid', create=True, return_value=0), patch.object(control.sys, 'argv', ['helper', action]), patch.object(control.sys, 'stdin', io.StringIO(data)):
            return control.main()

    def test_only_fixed_actions_and_confirmed_power(self):
        with self.assertRaisesRegex(ValueError, 'Unsupported'):
            self.invoke('shell')
        with patch.object(control, 'command') as command:
            with self.assertRaisesRegex(ValueError, 'confirmed'):
                self.invoke('shutdown')
            command.assert_not_called()
            self.invoke('reboot', '{"confirm":"reboot"}')
            self.assertEqual(command.call_args.args, ('/usr/bin/systemd-run', '--quiet', '--on-active=3s', '/usr/bin/systemctl', 'reboot'))
            self.invoke('shutdown', '{"confirm":"shutdown"}')
            self.assertEqual(command.call_args.args, ('/usr/bin/systemd-run', '--quiet', '--on-active=3s', '/usr/bin/systemctl', 'poweroff'))

    def test_recovery_requires_confirmation_and_uses_only_installed_script(self):
        with patch.object(control, 'command') as command:
            with self.assertRaisesRegex(ValueError, 'confirmed'):
                self.invoke('recovery')
            command.assert_not_called()
            self.invoke('recovery', '{"confirm":"recovery","command":"anything"}')
            self.assertEqual(command.call_args.args, ('/usr/bin/systemd-run', '--quiet', '--on-active=2s', '/usr/local/libexec/duck-arcade-recovery-open'))

    def test_update_uses_fixed_service_name(self):
        with patch.object(control, 'command') as command:
            self.invoke('update', '{"command":"anything"}')
            self.assertEqual(command.call_args.args, ('/usr/bin/systemctl', 'start', '--no-block', 'duck-arcade-update.service'))

    def test_wifi_password_uses_dbus_without_shell_or_command_arguments(self):
        class DBus:
            ByteArray = bytes
            ObjectPath = str
        class Manager:
            def AddAndActivateConnection(self, settings, device, access_point):
                self.settings = settings
        manager = Manager()
        with patch.object(control, 'wireless', return_value=(DBus, None, manager, None, '/device/1', None)), patch.object(control, 'command') as command:
            control.connect({'ssid': 'Classroom;$(example)', 'password': 'private-test-password'})
            self.assertEqual(manager.settings['802-11-wireless']['ssid'], b'Classroom;$(example)')
            self.assertEqual(manager.settings['802-11-wireless-security']['psk'], 'private-test-password')
            command.assert_not_called()
            with self.assertRaisesRegex(ValueError, '8'):
                control.connect({'ssid': 'Classroom', 'password': 'short'})
            with self.assertRaisesRegex(ValueError, 'SSID'):
                control.connect({'ssid': '../' * 20, 'password': ''})

if __name__ == '__main__':
    unittest.main()
