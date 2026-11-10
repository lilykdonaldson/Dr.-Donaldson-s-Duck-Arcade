

var p5Inst = new p5(null, 'sketch');

window.preload = function () {
  initMobileControls(p5Inst);

  p5Inst._predefinedSpriteAnimations = {};
  p5Inst._pauseSpriteAnimationsByDefault = false;
  var animationListJSON = {"orderedKeys":["a041b1b5-0644-4b1d-915f-c69ab6963675","767cdfbd-3cca-4b5a-a5f7-fd065b17ca3d","ea1a23cc-cc24-4050-b23f-e7b552c01b45","94518ef5-58f6-4f10-9554-27e756d198e7","33b9d251-fe06-4a79-998e-9ad2e93b90aa","f5e6b04e-13fe-4c62-bc54-a1abd5fcff3d","1c1d8e16-c030-43c8-9865-f82d73b4e1dc","28072f91-c556-4d2d-8636-52df0de0c4d1","74d4819c-d083-49fd-ae3a-20abe36f4bda","b00f24a7-f152-4cf1-932c-50fc96b5c47f","62dac22c-b876-49b5-971a-e0295de366ee"],"propsByKey":{"a041b1b5-0644-4b1d-915f-c69ab6963675":{"name":"face1","sourceUrl":null,"frameSize":{"x":107,"y":145},"frameCount":1,"looping":true,"frameDelay":12,"version":"gwXZQZhUGg3M1wcnxWaNMI9jjz.KiVkn","categories":[""],"loadedFromSource":true,"saved":true,"sourceSize":{"x":107,"y":145},"rootRelativePath":"assets/a041b1b5-0644-4b1d-915f-c69ab6963675.png"},"767cdfbd-3cca-4b5a-a5f7-fd065b17ca3d":{"name":"face2","sourceUrl":null,"frameSize":{"x":108,"y":145},"frameCount":1,"looping":true,"frameDelay":12,"version":"cvKDw4UD93_jgOgUS2egKqN.HzvsR4d7","categories":[""],"loadedFromSource":true,"saved":true,"sourceSize":{"x":108,"y":145},"rootRelativePath":"assets/767cdfbd-3cca-4b5a-a5f7-fd065b17ca3d.png"},"ea1a23cc-cc24-4050-b23f-e7b552c01b45":{"name":"face3","sourceUrl":null,"frameSize":{"x":106,"y":145},"frameCount":1,"looping":true,"frameDelay":12,"version":"5ZI2HgWfWxykjLOjrDySNDgUWFH1.M7_","categories":[""],"loadedFromSource":true,"saved":true,"sourceSize":{"x":106,"y":145},"rootRelativePath":"assets/ea1a23cc-cc24-4050-b23f-e7b552c01b45.png"},"94518ef5-58f6-4f10-9554-27e756d198e7":{"name":"face4","sourceUrl":null,"frameSize":{"x":107,"y":144},"frameCount":1,"looping":true,"frameDelay":12,"version":"KrMhNvQR3z2cEpXKrp83fMaee6A1hMDS","categories":[""],"loadedFromSource":true,"saved":true,"sourceSize":{"x":107,"y":144},"rootRelativePath":"assets/94518ef5-58f6-4f10-9554-27e756d198e7.png"},"33b9d251-fe06-4a79-998e-9ad2e93b90aa":{"name":"pluto","sourceUrl":"assets/v3/animations/728b08c3-da24-4714-a566-ae8428589433/33b9d251-fe06-4a79-998e-9ad2e93b90aa.png","frameSize":{"x":265,"y":265},"frameCount":1,"looping":true,"frameDelay":4,"version":"5CaT_S83mtI_TyLtRGKEXfyx8Ry8c9U4","categories":[""],"loadedFromSource":true,"saved":true,"sourceSize":{"x":265,"y":265},"rootRelativePath":"assets/v3/animations/728b08c3-da24-4714-a566-ae8428589433/33b9d251-fe06-4a79-998e-9ad2e93b90aa.png"},"f5e6b04e-13fe-4c62-bc54-a1abd5fcff3d":{"name":"background_landscape09_1","sourceUrl":"assets/api/v1/animation-library/gamelab/T167cO7veEolJu4MdK3thTgLhnqD_rJB/category_backgrounds/background_landscape09.png","frameSize":{"x":400,"y":399},"frameCount":1,"looping":true,"frameDelay":2,"version":"T167cO7veEolJu4MdK3thTgLhnqD_rJB","categories":["backgrounds"],"loadedFromSource":true,"saved":true,"sourceSize":{"x":400,"y":399},"rootRelativePath":"assets/api/v1/animation-library/gamelab/T167cO7veEolJu4MdK3thTgLhnqD_rJB/category_backgrounds/background_landscape09.png"},"1c1d8e16-c030-43c8-9865-f82d73b4e1dc":{"name":"alienPink_walk_1","sourceUrl":"assets/api/v1/animation-library/gamelab/Af7NpLfOWHlazTmrOp5NbuJO_oHxQPBc/category_fantasy/alienPink_walk.png","frameSize":{"x":72,"y":98},"frameCount":2,"looping":true,"frameDelay":2,"version":"Af7NpLfOWHlazTmrOp5NbuJO_oHxQPBc","categories":["fantasy"],"loadedFromSource":true,"saved":true,"sourceSize":{"x":144,"y":98},"rootRelativePath":"assets/api/v1/animation-library/gamelab/Af7NpLfOWHlazTmrOp5NbuJO_oHxQPBc/category_fantasy/alienPink_walk.png"},"28072f91-c556-4d2d-8636-52df0de0c4d1":{"name":"alienBeige_walk_1","sourceUrl":"assets/api/v1/animation-library/gamelab/MZhVSafRZ0zTo.guoIWvBvcVN2sJteV_/category_fantasy/alienBeige_walk.png","frameSize":{"x":72,"y":98},"frameCount":2,"looping":true,"frameDelay":2,"version":"MZhVSafRZ0zTo.guoIWvBvcVN2sJteV_","categories":["fantasy"],"loadedFromSource":true,"saved":true,"sourceSize":{"x":144,"y":98},"rootRelativePath":"assets/api/v1/animation-library/gamelab/MZhVSafRZ0zTo.guoIWvBvcVN2sJteV_/category_fantasy/alienBeige_walk.png"},"74d4819c-d083-49fd-ae3a-20abe36f4bda":{"name":"alienBlue_walk_1","sourceUrl":"assets/api/v1/animation-library/gamelab/dc4vui4_pmHrM.rep9aLGndzWtuC_cqp/category_fantasy/alienBlue_walk.png","frameSize":{"x":69,"y":98},"frameCount":2,"looping":true,"frameDelay":2,"version":"dc4vui4_pmHrM.rep9aLGndzWtuC_cqp","categories":["fantasy"],"loadedFromSource":true,"saved":true,"sourceSize":{"x":138,"y":98},"rootRelativePath":"assets/api/v1/animation-library/gamelab/dc4vui4_pmHrM.rep9aLGndzWtuC_cqp/category_fantasy/alienBlue_walk.png"},"b00f24a7-f152-4cf1-932c-50fc96b5c47f":{"name":"alienGreen_walk_1","sourceUrl":"assets/api/v1/animation-library/gamelab/KhGCMOy_GmSGbNF7hrN3JLopGwt9Bzuj/category_fantasy/alienGreen_walk.png","frameSize":{"x":72,"y":98},"frameCount":2,"looping":true,"frameDelay":2,"version":"KhGCMOy_GmSGbNF7hrN3JLopGwt9Bzuj","categories":["fantasy"],"loadedFromSource":true,"saved":true,"sourceSize":{"x":144,"y":98},"rootRelativePath":"assets/api/v1/animation-library/gamelab/KhGCMOy_GmSGbNF7hrN3JLopGwt9Bzuj/category_fantasy/alienGreen_walk.png"},"62dac22c-b876-49b5-971a-e0295de366ee":{"name":"alienYellow_walk_1","sourceUrl":"assets/api/v1/animation-library/gamelab/yK6UXQtnemQ5itIdr3t5PWyn_FP7jFUf/category_fantasy/alienYellow_walk.png","frameSize":{"x":72,"y":88},"frameCount":2,"looping":true,"frameDelay":2,"version":"yK6UXQtnemQ5itIdr3t5PWyn_FP7jFUf","categories":["fantasy"],"loadedFromSource":true,"saved":true,"sourceSize":{"x":144,"y":88},"rootRelativePath":"assets/api/v1/animation-library/gamelab/yK6UXQtnemQ5itIdr3t5PWyn_FP7jFUf/category_fantasy/alienYellow_walk.png"}}};
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
var gravity = 0.5;

// Array containing all alien color options from the Animation tab
var alienColors = ["Beige", "Green", "Blue", "Yellow", "Pink"];

var bg = createSprite(200, 200);
bg.setAnimation("background_landscape09_1");

// Player setup (drD moved to the right side of the screen)
var drD = createSprite(200, 200);
drD.setAnimation("face1");
drD.scale = 0.5;

// Target setup (Alien scrolls from left to right with positive velocity)
var alien = createSprite(-30, randomNumber(50, 300));
var randomColor = alienColors[randomNumber(0, 4)];
alien.setAnimation("alien" + randomColor + "_walk_1");
alien.scale = 0.7;
alien.velocityX = 4;

// Obstacle setup (Pluto scrolls faster from left to right with positive velocity)
var pluto = createSprite(-30, randomNumber(50, 300));
pluto.setAnimation("pluto");
pluto.scale = 0.3;
pluto.velocityX = 6;

function draw() {
  
  // Win / Lose Screen Conditionals
  if (health <= 0) {
    background("darkred");
    textSize(40);
    fill("white");
    text("Game Over!", 100, 200);
    textSize(20);
    text("Dr. D ran out of health!", 100, 250);
  } else if (points >= 11) {
    background("lightgreen");
    textSize(40);
    fill("darkblue");
    text("YOU WIN!", 110, 200);
    textSize(20);
    text("All aliens collected!", 120, 250);
  } else {

    // 1. User Controls & Gravity Physics (Flyer Mechanics)
    drD.velocityY = drD.velocityY + gravity;

    // Pressing Space or Up makes drD fly upward
    if (keyWentDown("space") || keyWentDown("up")) {
      drD.velocityY = -8;
    }

    // Floor boundary check
    if (drD.y > 340) {
      drD.y = 340;
      drD.velocityY = 0;
    }

    // Ceiling boundary check
    if (drD.y < 30) {
      drD.y = 30;
      drD.velocityY = 0;
    }

    // 2. Random-Type Animation (Jitter): Pluto shakes menacingly
    pluto.rotation = randomNumber(-15, 15);

    // 3. Side-Scrolling Loops: Reset collectibles and obstacles when off right edge
    if (alien.x > 430) {
      alien.x = -30;
      alien.y = randomNumber(50, 300);
      // Pick a random alien color on screen loop
      var nextColor = alienColors[randomNumber(0, 4)];
      alien.setAnimation("alien" + nextColor + "_walk_1");
    }

    if (pluto.x > 430) {
      pluto.x = -30;
      pluto.y = randomNumber(50, 300);
      pluto.velocityX = randomNumber(5, 8); // Random positive velocity
    }

    // 4. Collision 1: drD collects Alien
    if (drD.isTouching(alien)) {
      points = points + 1;
      alien.x = -30;
      alien.y = randomNumber(50, 300);
      // Pick a random alien color on collection
      var nextColor = alienColors[randomNumber(0, 4)];
      alien.setAnimation("alien" + nextColor + "_walk_1");
    }

    // 5. Collision 2: drD hits Pluto obstacle
    if (drD.isTouching(pluto)) {
      health = health - 1;
      pluto.x = -30;
      pluto.y = randomNumber(50, 300);
    }

    // 6. Animation Progression based on score thresholds
    if (points >= 10) {
      drD.setAnimation("face4");
    } else if (points >= 6) {
      drD.setAnimation("face3");
    } else if (points >= 3) {
      drD.setAnimation("face2");
    }

    // Draw game elements
    drawSprites();

    // UI Overlay Text
    textSize(20);
    fill("black");
    text("Points: " + points, 20, 30);
    fill("darkred");
    text("Health: " + health, 280, 30);
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
