

var p5Inst = new p5(null, 'sketch');

window.preload = function () {
  initMobileControls(p5Inst);

  p5Inst._predefinedSpriteAnimations = {};
  p5Inst._pauseSpriteAnimationsByDefault = false;
  var animationListJSON = {"orderedKeys":["a041b1b5-0644-4b1d-915f-c69ab6963675","767cdfbd-3cca-4b5a-a5f7-fd065b17ca3d","ea1a23cc-cc24-4050-b23f-e7b552c01b45","94518ef5-58f6-4f10-9554-27e756d198e7","37014b4a-069d-403b-8b6e-39fcde910600","33b9d251-fe06-4a79-998e-9ad2e93b90aa"],"propsByKey":{"a041b1b5-0644-4b1d-915f-c69ab6963675":{"name":"face1","sourceUrl":null,"frameSize":{"x":107,"y":145},"frameCount":1,"looping":true,"frameDelay":12,"version":"988_cXlHfzbkQh5pMTtAWAmhijWGc3Aq","categories":[""],"loadedFromSource":true,"saved":true,"sourceSize":{"x":107,"y":145},"rootRelativePath":"assets/a041b1b5-0644-4b1d-915f-c69ab6963675.png"},"767cdfbd-3cca-4b5a-a5f7-fd065b17ca3d":{"name":"face2","sourceUrl":null,"frameSize":{"x":108,"y":145},"frameCount":1,"looping":true,"frameDelay":12,"version":"lx4tDfF0bcvCCJsRDSZmyV_2N3FmQW21","categories":[""],"loadedFromSource":true,"saved":true,"sourceSize":{"x":108,"y":145},"rootRelativePath":"assets/767cdfbd-3cca-4b5a-a5f7-fd065b17ca3d.png"},"ea1a23cc-cc24-4050-b23f-e7b552c01b45":{"name":"face3","sourceUrl":null,"frameSize":{"x":106,"y":145},"frameCount":1,"looping":true,"frameDelay":12,"version":".M5MtY_20kAaQ1DJh7e9LXEB794kI_xv","categories":[""],"loadedFromSource":true,"saved":true,"sourceSize":{"x":106,"y":145},"rootRelativePath":"assets/ea1a23cc-cc24-4050-b23f-e7b552c01b45.png"},"94518ef5-58f6-4f10-9554-27e756d198e7":{"name":"face4","sourceUrl":null,"frameSize":{"x":107,"y":144},"frameCount":1,"looping":true,"frameDelay":12,"version":"7nRfeV0j5dxttDEQgXNbgIcqVpwOqtw8","categories":[""],"loadedFromSource":true,"saved":true,"sourceSize":{"x":107,"y":144},"rootRelativePath":"assets/94518ef5-58f6-4f10-9554-27e756d198e7.png"},"37014b4a-069d-403b-8b6e-39fcde910600":{"name":"ducky","sourceUrl":"assets/api/v1/animation-library/gamelab/H7ci7a4skZiXiNGkaJwDu9pdgz_VHH_8/category_icons/ducky.png","frameSize":{"x":395,"y":376},"frameCount":1,"looping":true,"frameDelay":2,"version":"H7ci7a4skZiXiNGkaJwDu9pdgz_VHH_8","categories":["icons"],"loadedFromSource":true,"saved":true,"sourceSize":{"x":395,"y":376},"rootRelativePath":"assets/api/v1/animation-library/gamelab/H7ci7a4skZiXiNGkaJwDu9pdgz_VHH_8/category_icons/ducky.png"},"33b9d251-fe06-4a79-998e-9ad2e93b90aa":{"name":"pluto","sourceUrl":"assets/v3/animations/2330a6e2-c3e8-413e-be0a-0af3e3868da1/33b9d251-fe06-4a79-998e-9ad2e93b90aa.png","frameSize":{"x":265,"y":265},"frameCount":1,"looping":true,"frameDelay":4,"version":"ego6BW43bDZYhNYekBtQGbkE031O8G8R","categories":[""],"loadedFromSource":true,"saved":true,"sourceSize":{"x":265,"y":265},"rootRelativePath":"assets/v3/animations/2330a6e2-c3e8-413e-be0a-0af3e3868da1/33b9d251-fe06-4a79-998e-9ad2e93b90aa.png"}}};
  var orderedKeys = animationListJSON.orderedKeys;
  var allAnimationsSingleFrame = false;
  orderedKeys.forEach(function (key) {
    var props = animationListJSON.propsByKey[key];
    var frameCount = allAnimationsSingleFrame ? 1 : props.frameCount;
    var image = loadImage(props.rootRelativePath, function () {
      var spriteSheet = loadSpriteSheet(
          image,
          props.frameSize.x,
          props.frameSize.y,
          frameCount
      );
      p5Inst._predefinedSpriteAnimations[props.name] = loadAnimation(spriteSheet);
      p5Inst._predefinedSpriteAnimations[props.name].looping = props.looping;
      p5Inst._predefinedSpriteAnimations[props.name].frameDelay = props.frameDelay;
    });
  });

  function wrappedExportedCode(stage) {
    if (stage === 'preload') {
      if (setup !== window.setup) {
        window.setup = setup;
      } else {
        return;
      }
    }
// -----

var points = 0;
var health = 5;
var shakeUntil = 0; // Stores the target time in seconds when shaking should stop

// Main character setup
var drD = createSprite(200, 300);
drD.setAnimation("face1");
drD.scale = 0.6;

// Target sprite setup
var ducky = createSprite(200, 100);
ducky.setAnimation("ducky");
ducky.scale = 0.1;

// Pluto sprite setup
var pluto = createSprite(randomNumber(50, 350), randomNumber(50, 350));
pluto.setAnimation("pluto");
pluto.velocityX = randomNumber(3, 5);
pluto.velocityY = randomNumber(3, 5);
pluto.scale = 0.3;

function draw() {
  background("lightblue");
  
  // Win / Lose Screen check
  if (health <= 0) {
    background("red");
    textSize(40);
    fill("white");
    text("You Lose!", 110, 200);
  } else if (points >= 15) {
    background("yellow");
    textSize(40);
    fill("purple");
    text("You Win!", 110, 200);
  } else {
    // Score update & collision detection with ducky
    if (drD.isTouching(ducky)) {
      points = points + 1;
      ducky.x = randomNumber(50, 350);
      ducky.y = randomNumber(50, 350);
  
      // ONLY update animations ONCE right when points change
      if (points >= 10) {
        drD.setAnimation("face4");
      } else if (points >= 6) {
        drD.setAnimation("face3");
      } else if (points >= 3) {
        drD.setAnimation("face2");
      }
    }
  
    // Health decrease & set shake target time (current seconds + 2)
    if (drD.isTouching(pluto)) {
      health = health - 1;
      shakeUntil = World.seconds + 1; 
      pluto.x = randomNumber(50, 350);
      pluto.y = randomNumber(50, 350);
    }
  
    // Apply rotation shake only while current time is less than shakeUntil target
    if (World.seconds < shakeUntil) {
      drD.rotation = randomNumber(-25, 25);
    } else {
      drD.rotation = 0;
    }
  
    // Pluto off-screen wrapping and velocity resets
    if (pluto.x > 400) {
      pluto.x = 0;
      pluto.velocityX = randomNumber(3, 5);
      pluto.velocityY = randomNumber(3, 5);
    } else if (pluto.x < 0) {
      pluto.x = 400;
      pluto.velocityX = randomNumber(3, 5);
      pluto.velocityY = randomNumber(3, 5);
    }
  
    if (pluto.y > 400) {
      pluto.y = 0;
      pluto.velocityX = randomNumber(3, 5);
      pluto.velocityY = randomNumber(3, 5);
    } else if (pluto.y < 0) {
      pluto.y = 400;
      pluto.velocityX = randomNumber(3, 5);
      pluto.velocityY = randomNumber(3, 5);
    }
  
    // Controls for drD
    if (keyDown("up")) {
      drD.y = drD.y - 5;
    }
    if (keyDown("down")) {
      drD.y = drD.y + 5;
    }
    if (keyDown("left")) {
      drD.x = drD.x - 5;
    }
    if (keyDown("right")) {
      drD.x = drD.x + 5;
    }
  
    // Draw game elements
    drawSprites();
  
    // Display score and health text
    textSize(20);
    fill("black");
    text("Points: " + points, 25, 25);
    text("Health: " + health, 280, 25);
  }
}

// -----
    try { window.draw = draw; } catch (e) {}
    switch (stage) {
      case 'preload':
        if (preload !== window.preload) { preload(); }
        break;
      case 'setup':
        if (setup !== window.setup) { setup(); }
        break;
    }
  }
  window.wrappedExportedCode = wrappedExportedCode;
  wrappedExportedCode('preload');
};

window.setup = function () {
  window.wrappedExportedCode('setup');
};
