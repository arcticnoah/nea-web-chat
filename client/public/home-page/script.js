// Preloader active code
$(window).on('load', function () {
    $('#preloader').fadeOut('slow', function () {
        $(this).remove();
    });
});

$(document).ready(function(){
    $('.header').height($(window).height());
})