String.prototype.pxWidth = function (font) {
	let canvas = String.prototype.pxWidth.canvas ||
		(String.prototype.pxWidth.canvas = document.createElement("canvas")),
		context = canvas.getContext("2d");
	font && (context.font = font);
	let metrics = context.measureText(this);
	return metrics.width;
}

function isNumber(str) {
	return !isNaN(parseInt(str));
}

function getPureStr(str) {
	let spices = str.split('^');
	let res = spices[0];
	for (let i = 1; i < spices.length; i++) {
		let tmp = spices[i];
		if (isNumber(tmp.charAt(0))) {
			let rm = parseInt(tmp).toString();
			tmp = tmp.substring(rm.length);
		}
		else {
			tmp = '^' + tmp;
		}
		res += tmp;
	}
	return res;
}

function loadingPage() {
	let heart_div = $('.heart');
	let heart_parent = heart_div.parent();
	let page_width = heart_parent.width();
	let page_height = heart_parent.height();
	let heart_width = heart_div.width();
	let heart_height = heart_div.height();
	heart_div.css('top', (page_height - heart_height) / 2);
	heart_div.css('left', (page_width - heart_width) / 2);
}

$("#open").click(function () {
	if (!envelope_opened) {
		openEnvelope();
	}
});

// 信封打开逻辑
function openEnvelope() {
	$('#wax-half').css('display', "block");

typedInstance = new Typed('.letter', {
		strings: [
			"^1000",
			content.salutation + "<br><br>" +
			content.body + "<br><br><p style='float:right; display:block; width:" +
			content.sign + "px;'>^1000" + content.signature + "</p>"
		],
		typeSpeed: 100,
		backSpeed: 50,
		onComplete: function() {
			// 打字效果完成后显示"下一页"按钮
			addNextPageButton();
		}
	});

	$('#open').find("span").eq(0).css('background-position', "0 -150px");
	envelope_opened = true;
	// 添加类来隐藏提示文本
	$('#contact').addClass('envelope-opened');
	console.log('Envelope opened, added envelope-opened class to #contact');
	let player = document.getElementById('music');
	if (player.paused) {
		player.play();
		$('#music_btn').css("display", "block");
	}
}

// 双击信件内容立即完成打字效果
// 双击事件监听
$('#letter').dblclick(function() {
	if (window.typedInstance && !window.typedInstance.isComplete) {
		// 立即完成打字效果
		window.typedInstance.stop();
		$('.letter').html(content.salutation + "<br><br>" + content.body + "<br><br><p style='float:right; display:block; width:" + content.sign + "px;'>" + content.signature + "</p>");

		// 如果按钮还没添加，立即添加下一页按钮
		if ($('#next-page-btn').length === 0) {
			addNextPageButton();
		}

		console.log('Double-click detected, showing full content immediately');
	}
});

// 添加下一页按钮
function addNextPageButton() {
	// 检查是否已经存在下一页按钮，避免重复添加
	if ($('#next-page-btn').length === 0) {
		const nextBtn = $('<button id="next-page-btn" class="next-page-btn">下一页 →</button>');
		$('#data').append(nextBtn);

		// 添加点击事件，跳转到下一页
		$('#next-page-btn').click(function() {
			window.location.href = 'page2.html';
		});
	}
}

// Mouse interaction for envelope flipping
$(document).ready(function() {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;
    let envelope = $('#contact');
    let lid = $('#lid');
    let letter = $('#letter');

    // Mouse down event for drag start
    envelope.on('mousedown', function(e) {
        if (!envelope_opened) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            console.log('Drag started', startX, startY);
            e.preventDefault();
        }
    });

    // Touch start event for mobile
    envelope.on('touchstart', function(e) {
        if (!envelope_opened) {
            isDragging = true;
            startX = e.originalEvent.touches[0].clientX;
            startY = e.originalEvent.touches[0].clientY;
            e.preventDefault();
        }
    });

    // Mouse move event for dragging
    $(document).on('mousemove', function(e) {
        if (isDragging && !envelope_opened) {
            let deltaX = e.clientX - startX;
            let deltaY = e.clientY - startY;

            // Apply continuous rotation that accumulates with dragging
            currentRotationY = Math.max(-180, Math.min(180, currentRotationY + deltaX * 0.3));
            currentRotationX = Math.max(-180, Math.min(180, currentRotationX - deltaY * 0.3));

            envelope.find('form.flip').css({
                'transform': 'rotateX(' + currentRotationX + 'deg) rotateY(' + currentRotationY + 'deg)',
                'transition': 'none'
            });

            // Update start positions for next move event
            startX = e.clientX;
            startY = e.clientY;
        }
    });

    // Touch move event for mobile
    $(document).on('touchmove', function(e) {
        if (isDragging && !envelope_opened) {
            let deltaX = e.originalEvent.touches[0].clientX - startX;
            let deltaY = e.originalEvent.touches[0].clientY - startY;

            // Apply continuous rotation that accumulates with dragging
            currentRotationY = Math.max(-180, Math.min(180, currentRotationY + deltaX * 0.3));
            currentRotationX = Math.max(-180, Math.min(180, currentRotationX - deltaY * 0.3));

            envelope.find('form.flip').css({
                'transform': 'rotateX(' + currentRotationX + 'deg) rotateY(' + currentRotationY + 'deg)',
                'transition': 'none'
            });

            // Update start positions for next move event
            startX = e.originalEvent.touches[0].clientX;
            startY = e.originalEvent.touches[0].clientY;
            e.preventDefault();
        }
    });

    // Mouse up event for drag end
    $(document).on('mouseup', function() {
        if (isDragging && !envelope_opened) {
            isDragging = false;
            // Envelope stays in current rotated position - no automatic return
        }
    });

    // Touch end event for mobile
    $(document).on('touchend', function() {
        if (isDragging && !envelope_opened) {
            isDragging = false;
            // Envelope stays in current rotated position - no automatic return
        }
    });

    // Mouse wheel interaction for rotating
    envelope.on('wheel', function(e) {
        if (!envelope_opened) {
            e.preventDefault();
            let delta = e.originalEvent.deltaY;

            if (delta > 0) {
                // Flip to back side and stay there
                envelope.find('form.flip').css({
                    'transform': 'rotateY(180deg)',
                    'transition': 'transform 0.7s'
                });
            } else {
                // Return to front side
                envelope.find('form.flip').css({
                    'transform': 'rotateY(0deg)',
                    'transition': 'transform 0.7s'
                });
            }
        }
    });

    // Hover effects for better visual feedback
    envelope.hover(
        function() {
            if (!envelope_opened) {
                $(this).css('cursor', 'grab');
            }
        },
        function() {
            $(this).css('cursor', 'default');
        }
    );

    // Make envelope draggable when pressed
    envelope.on('mousedown', function() {
        if (!envelope_opened) {
            $(this).css('cursor', 'grabbing');
        }
    });

    $(document).on('mouseup', function() {
        envelope.css('cursor', 'default');
    });
});