let envelope_opened = false;
let content = {
    salutation: "",
    signature: "",
    body: "",
    sign: 0
};

function playPause() {
    let player = document.getElementById('music');
    let play_btn = $('#music_btn');
    if (player.paused) {
        player.play();
        play_btn.attr('class', 'play');
    }
    else {
        player.pause();
        play_btn.attr('class', 'mute');
    }
}

window.onload = function () {
    console.log('Page loaded, starting initialization...');
    loadingPage();
    $.ajaxSettings.async = true;
    $.getJSON("./font/content.json", function (result) {
        console.log('Content loaded successfully:', result);
        content.salutation = result.salutation;
        content.signature = result.signature;
        content.body = result.body;
        content.sign = getPureStr(content.signature).pxWidth('18px Satisfy, serif');
        document.title = result.title;
        $('#recipient').append(result.recipient);
        $('#flipback').text(result.sender);
        $('#music').attr('src', result.bgm);
        $('#envelope').fadeIn('slow');
        $('.heart').fadeOut('fast');
        let currentUrl = window.location.href;
        let firstIndex = currentUrl.indexOf("#");
        // Don't auto-add hash to prevent CSS :target interference

    }).fail(function(jqxhr, textStatus, error) {
        console.error('Failed to load content.json:', textStatus, error);
        // Show envelope even if content loading fails
        $('#envelope').fadeIn('slow');
    });
    let contact = $('#contact');
    console.log('Contact element found:', contact.length, contact);
    let mtop = (window.innerHeight - contact.height()) * 0.5;
    contact.css('margin-top', mtop + 'px');
    $('body').css('opacity', '1');
    $('#jsi-cherry-container').css('z-index', '-99');
    console.log('Initialization complete');
}

window.onresize = function () {
    let cherry_container = $('#jsi-cherry-container');
    let canvas = cherry_container.find('canvas').eq(0);
    canvas.height(cherry_container.height());
    canvas.width(cherry_container.width());
    // Do scaling for sakura background when the window is resized
    loadingPage();
}