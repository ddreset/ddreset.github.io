var carousel = document.getElementById("carousel-content");
var carouselContent = carousel.children;
var carouselContent_len = carouselContent.length;
var carouselWidth = carouselContent_len * 80;
var carouselLeft = 90 - carouselWidth;
carousel.style.width = carouselWidth + "%";
carousel.style.left = carouselLeft + "%";
var carouselSlider = document.getElementById("carousel-slider");
carouselSlider.max = carouselContent_len - 1;
carouselSlider.value = carouselSlider.max

function moveCarouselContent(mainCard_num) { //from left to right, 0 to len-1
    var newCarouselLeft = -80 * mainCard_num + 10;
    if (newCarouselLeft != carouselLeft) {
        var interval = (newCarouselLeft - carouselLeft) / 10;
        var moveCount = 0
        var timer = null;
        timer = setInterval(function() {
            if (moveCount >= 10) {
                clearInterval(timer);
            } else {
                carouselLeft += interval;
                carousel.style.left = carouselLeft + "%";
                moveCount++;
            }
        }, 100);
    }
}

function showCard(node) {
    var nodeArr = Array.from(carouselContent);
    var index = nodeArr.indexOf(node);
    moveCarouselContent(index);
    carouselSlider.MaterialSlider.change(index);
}

function sliderChange(e) {
    var value = e.value;
    moveCarouselContent(value);
}

document.getElementById("getStarted").onclick = function(event) {
    event.stopPropagation(); 
    event.preventDefault();
    
    moveCarouselContent(carouselContent_len - 2);
    carouselSlider.MaterialSlider.change(1);
}

function moveOne(direction) {
    var value = null;
    if (direction == "left") {//move to left page
        value = parseInt(carouselSlider.value) + 1;
    }else if(direction == "right"){//move to right page
        value = parseInt(carouselSlider.value) - 1;
    }
    if (value > -1 && value < carouselContent_len) {
        moveCarouselContent(carouselContent_len - 1 - value);
        carouselSlider.MaterialSlider.change(value);
    }
}

document.onkeydown = function(event) {//left and right on keyboard
    var keyCode = null;
    if(event){
        keyCode = event.keyCode;
    }else{
        keyCode = event.which;
    }
    if (keyCode == 37) { //left 
        moveOne("right");
    }
    if (keyCode == 39) { //right
        moveOne("left");
    }
}

var xx,yy,XX,YY,swipeX,swipeY;
carousel.addEventListener('touchstart', function(event) {
    //event.stopPropagation();
    //event.preventDefault(); 
    xx = event.targetTouches[0].screenX;//horizontal
    yy = event.targetTouches[0].screenY;//vertical
    swipeX = true;
    swipeY = true;
})

carousel.addEventListener('touchmove', function(event) {
    XX = event.targetTouches[0].screenX;
    YY = event.targetTouches[0].screenY;
    if (swipeX && Math.abs(XX - xx) - Math.abs(YY - yy) > 0) //horizontal
    {
        event.stopPropagation(); 
        event.preventDefault(); 
        swipeY = false;
    } else if (swipeY && Math.abs(XX - xx) - Math.abs(YY - yy) < 0) { //vertical
        swipeX = false;
    }
})
carousel.addEventListener('touchend', function(event) {
    if (swipeX == true && Math.abs(XX - xx) > 20) {
        if (XX - xx > 0) {
            moveOne("left");
        }else{moveOne("right");}
    }
    //event.stopPropagation();
    //event.preventDefault(); 
})