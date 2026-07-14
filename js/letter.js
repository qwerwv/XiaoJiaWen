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

// 全局变量
typedInstance = null;

$("#open").click(function () {
	if (!envelope_opened) {
		$('#wax-half').css('display', "block");

		typedInstance = new Typed('.letter', {
			strings: [
				"^1000",
				content.salutation + "<br><br>" +
				content.body + "<br><br><p style='float:right; display:block; width:" +
				content.sign + "px;'>" + content.signature + "</p>"
			],
			typeSpeed: 100,
			backSpeed: 50,
			onComplete: function() {
				// 打字效果完成后显示"下一页"按钮
				setTimeout(function() {
					addNextPageButton();
				}, 100);
			}
		});

		$('#open').find("span").eq(0).css('background-position', "0 -150px");
		envelope_opened = true;
		// 添加类来隐藏提示文本
		$('#contact').addClass('envelope-opened');
		// 显示双击提示
		showDoubleClickHint();
		// 启用滚轮翻阅功能
		enableScrolling();
		console.log('Envelope opened, added envelope-opened class to #contact');
		let player = document.getElementById('music');
		if (player.paused) {
			player.play();
			$('#music_btn').css("display", "block");
		}
	}
});

// 添加下一页按钮
function addNextPageButton() {
	// 检查是否已经存在下一页按钮，避免重复添加
	if ($('#next-page-btn').length === 0) {
		// 移除双击提示
		$('.double-click-hint').remove();

		const nextBtn = $('<button id="next-page-btn" class="next-page-btn">下一页 →</button>');

		// 将按钮添加到信件内容的最后，跟随文字一起滚动
		$('.letter').append(nextBtn);

		// 使用事件委托添加点击事件，确保事件正确绑定
		$('#next-page-btn').off('click').on('click', function(e) {
			e.preventDefault();
			console.log('下一页按钮被点击，跳转到page2.html');
			console.log('当前URL:', window.location.href);
			console.log('目标URL:', new URL('page2.html', window.location.href).href);
			window.location.href = 'page2.html';
		});

		console.log('下一页按钮已添加到信件内容末尾');
	} else {
		console.log('下一页按钮已存在，重新绑定事件');
		// 重新绑定事件以防万一
		$('#next-page-btn').off('click').on('click', function(e) {
			e.preventDefault();
			console.log('下一页按钮被点击(重新绑定)，跳转到page2.html');
			console.log('当前URL:', window.location.href);
			console.log('目标URL:', new URL('page2.html', window.location.href).href);
			window.location.href = 'page2.html';
		});
	}
}

// 显示双击提示
function showDoubleClickHint() {
	// 如果提示不存在，则添加
	if ($('.double-click-hint').length === 0) {
		const hint = $('<div class="double-click-hint">双击可跳过动画</div>');
		$('#data').prepend(hint);
	}
}

// 启用滚轮翻阅功能
function enableScrolling() {
	// 确保data容器可以正常滚动
	$('#data').css({
		'overflow-y': 'auto',
		'overflow-x': 'hidden',
		'max-height': '210px' // 确保有最大高度以启用滚动
	});

	// 添加滚轮事件监听器
	$('#data').off('wheel.scroll').on('wheel.scroll', function(e) {
		// 允许默认的滚动行为，但阻止冒泡到信封容器
		e.stopPropagation();

		// 检查内容是否需要滚动
		const hasScrollableContent = this.scrollHeight > this.clientHeight;
		if (hasScrollableContent) {
			// 让浏览器处理默认的滚动行为
			console.log('滚轮滚动，当前滚动位置:', this.scrollTop);
		}
	});

	console.log('滚轮翻阅功能已启用');
}

// 双击信件内容立即完成打字效果
$(document).ready(function() {
	// 双击事件监听
	$('#letter').dblclick(function() {
		if (typedInstance) {
			// 检查是否还有打字动画在进行
			// 通过检查Typed.js的内部状态来判断
			let isTyping = typedInstance &&
						  typedInstance.arrayPos < typedInstance.strings.length - 1 ||
						  (typedInstance.arrayPos === typedInstance.strings.length - 1 &&
						   !typedInstance.strings[typedInstance.arrayPos].endsWith(typedInstance.text));

			if (isTyping) {
				console.log('开始跳过动画...');

				// 停止并销毁Typed实例
				typedInstance.stop();
				if (typedInstance.destroy) {
					typedInstance.destroy();
				}

				// 确保目标元素存在
				let $letter = $('.letter');
				if ($letter.length === 0) {
					console.error('找不到 .letter 元素');
					return;
				}

				// 移除双击提示
				$('.double-click-hint').remove();

				// 构建完整的信件内容
				let finalContent = content.salutation + "<br><br>" + content.body + "<br><br><p style='float:right; display:block; width:" + content.sign + "px;'>" + content.signature + "</p>";

				console.log('设置完整内容，长度:', finalContent.length);

				// 直接设置内容，不使用hide/show动画
				$letter.html(finalContent);

				// 创建并添加下一页按钮
				if ($('#next-page-btn').length === 0) {
					addNextPageButton();
					console.log('下一页按钮已添加');
				}

				console.log('双击跳过完成，完整内容已显示');

				// 启用滚轮支持
				setTimeout(function() {
					enableScrolling();
					console.log('滚轮功能已启用');
				}, 100);
			}
		}
	});

	// Mouse interaction for envelope flipping
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
