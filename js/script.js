(function($) {

  "use strict";

  // init Isotope
	var initIsotope = function () {

		$('.grid').each(function () {

			// $('.grid').imagesLoaded( function() {
			// images have loaded
			var $buttonGroup = $('.button-group');
			var $checked = $buttonGroup.find('.is-checked');
			var filterValue = $checked.attr('data-filter');

			var $grid = $('.grid').isotope({
				itemSelector: '.portfolio-item',
				// layoutMode: 'fitRows',
				filter: filterValue
			});

			// bind filter button click
			$('.button-group').on('click', 'a', function (e) {
				e.preventDefault();
				filterValue = $(this).attr('data-filter');
				$grid.isotope({ filter: filterValue });
			});

			// change is-checked class on buttons
			$('.button-group').each(function (i, buttonGroup) {
				$buttonGroup.on('click', 'a', function () {
					$buttonGroup.find('.is-checked').removeClass('is-checked');
					$(this).addClass('is-checked');
				});
			});
			// });

		});
	}

  var initTexts = function(){
    // Wrap every letter in a span
     $('.txt-fx').each(function(){
      this.innerHTML = this.textContent.replace(/\S/g, "<span class='letter'>$&</span>");
    });

    anime.timeline()
      .add({
        targets: '.txt-fx .letter',
        translateX: [0,-30],
        opacity: [1,0],
        easing: "easeInExpo",
        duration: 100,
        delay: (el, i) => 0
      });
  }
  var animateTexts = function(){

    anime.timeline()
      .add({
        targets: '.slick-current .txt-fx .letter',
        translateX: [40,0],
        translateZ: 0,
        opacity: [0,1],
        easing: "easeOutExpo",
        duration: 1200,
        delay: (el, i) => 30 * i
      });
  }

  var hideTexts = function(){

    anime.timeline()
      .add({
        targets: '.slick-current .txt-fx .letter',
        translateX: [0,-30],
        opacity: [1,0],
        easing: "easeInExpo",
        duration: 1100,
        delay: (el, i) => 30 * i
      })
  }

  // initialize all the sliders
  var initSlider = function() {
    // homepage slider | slick slider
    $('.main-slider').slick({
        autoplay: false,
        autoplaySpeed: 4000,
        fade: true,
        prevArrow: $('.prev'),
        nextArrow: $('.next'),
    });

    $('.main-slider').on('beforeChange', function(event, slick, currentSlide, nextSlide){
      hideTexts();
      console.log('beforeChange');
    });

    $('.main-slider').on('afterChange', function(event, slick, currentSlide, nextSlide){
      animateTexts();
      console.log('afterChange');
    });

    // testimonial slider | slick slider
    $('.testimonial-slider').slick({
        autoplay: true,
        autoplaySpeed: 5000,
        fade: false,
        arrows: false,
        dots: true,
    });
    
    initTexts();
    animateTexts();
  }

  // animate search box
  var searchButton = function() {
    // search box toggle
    $('#header-wrap').on('click', '.search-toggle', function(e) {
      var selector = $(this).data('selector');

      $(selector).toggleClass('show').find('.search-input').focus();
      $(this).toggleClass('active');

      e.preventDefault();
    });


    // close when click off of container
    $(document).on('click touchstart', function (e){
      if (!$(e.target).is('.search-toggle, .search-toggle *, #header-wrap, #header-wrap *')) {
        $('.search-toggle').removeClass('active');
        $('#header-wrap').removeClass('show');
      }
    });
  }

  // initialize tabs
  var jsTabs = function() {
    // portfolio tabs
    const tabs = document.querySelectorAll('[data-tab-target]')
    const tabContents = document.querySelectorAll('[data-tab-content]')

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = document.querySelector(tab.dataset.tabTarget)
        tabContents.forEach(tabContent => {
          tabContent.classList.remove('active')
        })
        tabs.forEach(tab => {
          tab.classList.remove('active')
        })
        tab.classList.add('active')
        target.classList.add('active')
      })
    });
  }

  // stick header on the top
  var stickyHeader = function() {
    // header menu
    var StickyHeader = new hcSticky('#header.fixed', {
      stickTo: 'body',
      top: 0,
      bottomEnd: 200,
      responsive: {
        1024: {
          disable: true
        }
      }
    });
  }

  //Overlay Menu Navigation
  var overlayMenu = function () {

    if(!$('.nav-overlay').length) {
      return false;
    }

    var body = undefined;
    var menu = undefined;
    var menuItems = undefined;
    var init = function init() {
      body = document.querySelector('body');
      menu = document.querySelector('.menu-btn');
      menuItems = document.querySelectorAll('.nav__list-item');
      applyListeners();
    };
    var applyListeners = function applyListeners() {
      menu.addEventListener('click', function () {
        return toggleClass(body, 'nav-active');
      });
    };
    var toggleClass = function toggleClass(element, stringClass) {
      if (element.classList.contains(stringClass)) element.classList.remove(stringClass);else element.classList.add(stringClass);
    };
    init();
  }

  // init Chocolat light box
  var initChocolat = function() {
    Chocolat(document.querySelectorAll('.image-link'), {
        imageSize: 'contain',
        loop: true,
    })
  }

  var contactForm = function () {
  var $form = $('#form-contact');
  var $status = $('#form-status');
  if (!$form.length) return;

  $form.on('submit', function (e) {
    e.preventDefault();
    var $btn = $form.find('button[type="submit"]').prop('disabled', true).text('Enviando...');
    $status.css('color', '#ccc').text('');

    fetch($form.attr('action'), {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData($form[0])
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success === 'true' || data.success === true) {
          $status.css('color', '#8fd19e').text('¡Mensaje enviado! Te responderemos pronto.');
          $form[0].reset();
        } else {
          throw new Error(data.message || 'Error');
        }
      })
      .catch(function () {
        $status.css('color', '#e57373').text('No se pudo enviar. Intenta de nuevo en un momento.');
      })
      .finally(function () {
        $btn.prop('disabled', false).text('Enviar');
      });
  });
};
// Menú overlay: cerrar y llevar a la sección al hacer clic
var overlayMenuLinks = function () {
  var $body = $('body');

  function closeMenu() {
    $body.removeClass('nav-active');
    $('#menu-toggle').prop('checked', false); // restaura el ícono de hamburguesa
  }

  $('.nav-overlay a[href^="#"], .nav-overlay a[href="index.html"]').on('click', function (e) {
    var href = $(this).attr('href');
    e.preventDefault();
    closeMenu();

    var top = 0;
    if (href !== 'index.html' && href !== '#') {
      var $target = $(href);
      if ($target.length) top = $target.offset().top;
    }
    $('html, body').stop().animate({ scrollTop: top }, 700, 'easeInOutCubic');
  });

  // Cerrar con la tecla Esc
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $body.hasClass('nav-active')) closeMenu();
  });
};
  $(document).ready(function(){

    stickyHeader();
    searchButton();
    initSlider();
    jsTabs();
    initChocolat();
    overlayMenu();
    overlayMenuLinks();

    jarallax(document.querySelectorAll(".jarallax"));

    jarallax(document.querySelectorAll(".jarallax-keep-img"), {
      keepImg: true,
    });

  }); // End of document ready

  // preloader
	$(window).load(function () {
		$(".preloader").fadeOut("slow");
		initIsotope();
	});

})(jQuery);