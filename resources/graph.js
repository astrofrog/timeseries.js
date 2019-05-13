/* graph.js */
(function(root){

	// First we will include all the useful helper functions

	/**
	 * @desc Make a copy of the object (to avoid over-writing it)
	 */
	function clone(a){ return JSON.parse(JSON.stringify(a)); }

	/**
	 * @desc Remove trailing zeroes after decimal point
	 */
	function clip(a){ return a.replace(/(\.[0-9]+?)0+$/,function(m,p1){return p1;}); }

	/**
	 * @desc Convert a "#xxxxxx" colour into an "rgba(r,g,b,a)" colour
	 */
	function hex2rgba(hex,a){
		var o = getRGB(hex,a);
		return 'rgba('+o.r+','+o.g+','+o.b+','+o.a+')';
	}

	/**
	 * @desc Extract the RGB values
	 */
	function getRGB(c,a){
		var r,g,b;
		a = (a||1);
		if(c.indexOf('#')==0){
			r = parseInt(c.substr(1,2),16);
			g = parseInt(c.substr(3,2),16);
			b = parseInt(c.substr(5,2),16);
		}else if(c.indexOf("rgba")==0){
			c.replace(/rgba\(([0-9]+),([0-9]+),([0-9]+),([0-9\.]+)\)/,function(m,p1,p2,p3,p4){ r = parseInt(p1); g = parseInt(p2); b = parseInt(p3); a = parseFloat(p4); return m; });
		}else if(c.indexOf("rgb(")==0){
			c.replace(/rgb\(([0-9]+),([0-9]+),([0-9]+)\)/,function(m,p1,p2,p3){ r = p1; g = p2; b = p3; return m; });
		}
		return {'r':r,'g':g,'b':b,'a':a};
	}

	var hasbig = false;
	if(typeof Big==="function") hasbig = true;

	/**
	 * @desc Basic wrapper around big.js to avoid problems and add features
	 */
	function Num(v){
		/**
		 * @desc Create an object that has similar properties to Big
		 */
		function N(v){
			this.type = "Num";
			this.o = v;
			this.v = (hasbig ? new Big(v==null ? 0 : v) : parseFloat(v));
			this.toValue = function(){ return Number(this.v.toString()); };
			this.toString = function(){ return clip(typeof this.o=="string" ? this.o : this.o.toString()); };
			this.toExponential = function(dp){ return this.v.toExponential(dp); };

			return this;
		}
		// Boolean results
		N.prototype.eq = function(b){ return this.v.eq(b); };
		N.prototype.gt = function(b){ return this.v.gt(b); };
		N.prototype.gte = function(b){ return this.v.gte(b); };
		N.prototype.lt = function(b){ return this.v.lt(b); };
		N.prototype.lte = function(b){ return this.v.lte(b); };

		// Return a Num type
		N.prototype.abs = function(){ return Num(this.v.abs()); };
		N.prototype.plus = function(n){ return Num(this.v.plus(n)); };
		N.prototype.minus = function(n){ return Num(this.v.minus(n)); };
		N.prototype.div = function(n){ return Num(this.v.div(n)); };
		N.prototype.times = function(n){ return Num(this.v.times(n)); };
		N.prototype.pow = function(n){ return Num(this.v.pow(n)); };
		N.prototype.pow10 = function(n){ var b = Num(this); b.v.e += n; return b; };
		N.prototype.round = function(dp,t){ return Num(this.v.round(dp,(typeof t==="number" ? t:1))); };
		N.prototype.floor = function(dp){ return Num(this.v.round(dp,0)); };
		N.prototype.ceil = function(dp){ return Num(this.v.round(dp,3)); };

		return new N(v);
	}
	root.Num = Num;

	/*@cc_on
	// Fix for IE's inability to handle arguments to setTimeout/setInterval
	// From http://webreflection.blogspot.com/2007/06/simple-settimeout-setinterval-extra.html
	(function(f){
		window.setTimeout =f(window.setTimeout);
		window.setInterval =f(window.setInterval);
	})(function(f){return function(c,t){var a=[].slice.call(arguments,2);return f(function(){c.apply(this,a)},t)}});
	@*/

	// Full Screen API - http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
	var fullScreenApi = {
		supportsFullScreen: false,
		isFullScreen: function() { return false; },
		requestFullScreen: function() {},
		cancelFullScreen: function() {},
		fullScreenEventName: '',
		prefix: ''
	},
	browserPrefixes = 'webkit moz o ms khtml'.split(' ');
	// check for native support
	if(typeof document.cancelFullScreen != 'undefined') fullScreenApi.supportsFullScreen = true;
	else{
		// check for fullscreen support by vendor prefix
		for(var i = 0, il = browserPrefixes.length; i < il; i++ ) {
			fullScreenApi.prefix = browserPrefixes[i];
			if(typeof document[fullScreenApi.prefix + 'CancelFullScreen' ] != 'undefined' ) {
				fullScreenApi.supportsFullScreen = true;
				break;
			}
		}
	}
	// update methods to do something useful
	if(fullScreenApi.supportsFullScreen) {
		fullScreenApi.fullScreenEventName = fullScreenApi.prefix + 'fullscreenchange';
		fullScreenApi.isFullScreen = function() {
			switch (this.prefix) {
				case '':
					return document.fullScreen;
				case 'webkit':
					return document.webkitIsFullScreen;
				default:
					return document[this.prefix + 'FullScreen'];
			}
		};
		fullScreenApi.requestFullScreen = function(el){ return (this.prefix === '') ? el.requestFullScreen() : el[this.prefix + 'RequestFullScreen'](); };
		fullScreenApi.cancelFullScreen = function(el){ return (this.prefix === '') ? document.cancelFullScreen() : document[this.prefix + 'CancelFullScreen'](); };
		fullScreenApi.element = function(){ return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement; };
	}
	// export api
	root.fullScreenApi = fullScreenApi;
	// End of Full Screen API

	// Polyfill for isArray()
	if(!Array.isArray) Array.isArray = function(arg){ return Object.prototype.toString.call(arg) === '[object Array]'; };

	// Extra mathematical/helper functions that will be useful - inspired by http://alexyoung.github.com/ico/
	var G = {};
	G.sum = function(a) { var i, sum; for (i = 0, sum = 0; i < a.length; sum += a[i++]){} return sum; };
	if(typeof Array.prototype.max === 'undefined') G.max = function(a) { return Math.max.apply({}, a); };
	else G.max = function(a) { return a.max(); };
	if(typeof Array.prototype.min === 'undefined') G.min = function(a) { return Math.min.apply({}, a); };
	else G.min = function(a) { return a.min(); };
	G.mean = function(a) { return G.sum(a) / a.length; };
	G.stddev = function(a) { return Math.sqrt(G.variance(a)); };
	G.log10 = function(v) { return (Math.log10 ? Math.log10(v) : Math.log(v)/2.302585092994046); };
	G.variance = function(a) { var mean = G.mean(a), variance = 0; for (var i = 0; i < a.length; i++) variance += Math.pow(a[i] - mean, 2); return variance / (a.length - 1); };
	G.deepExtend = function(destination, source) {
		for(var property in source){
			if(typeof source[property] === "object"){
				// If the object type has changed, we'll over-write the object entirely
				if(Array.isArray(source[property]) != Array.isArray(destination[property])){
					destination[property] = clone(source[property]);
				}else{
					destination[property] = destination[property] || {};
					arguments.callee(destination[property], source[property]);
				}
			}else{
				destination[property] = source[property];
			}
		}
		return destination;
	};
	if(typeof Object.extend === 'undefined') {
		G.extend = function(destination, source) {
			for (var property in source) {
				if (source.hasOwnProperty(property)) destination[property] = source[property];
			}
			return destination;
		};
	}else G.extend = Object.extend;
	if(Object.keys) G.keys = Object.keys;
	else {
		G.keys = function(o) {
			if (o !== Object(o)) throw new TypeError('Object.keys called on non-object');
			var ret = [], p;
			for(p in o) {
				if(Object.prototype.hasOwnProperty.call(o,p)) ret.push(p);
			}
			return ret;
		};
	}

	/**
	 * @desc Define a shortcut for checking variable types
	 */
	function is(a,b){ return (typeof a == b) ? true : false; }

	/**
	 * @desc Fill a number with zeroes
	 */
	function zeroFill(number, width){
		width -= number.toString().length;
		if(width > 0) return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
		return number + ""; // always return a string
	}

	/**
	 * @desc A non-jQuery dependent function to get a style
	 */
	function getStyle(el, styleProp) {
		if (typeof window === 'undefined') return;
		var style;
		if(!el) return style;
		if (el.currentStyle) style = el.currentStyle[styleProp];
		else if (window.getComputedStyle) style = document.defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
		if (style && style.length === 0) style = null;
		return style;
	}
	// End of helper functions

	/**
	 * @desc Define the class to deal with <code>canvas</code>.
	 * @param {HTMLelement} container - the container to create a canvas within
	 * @param {object} i - properties for the canvas
	 * @param {boolean} i.logging - do we log to the console?
	 * @param {string} i.background - the hex code to use for the background color
	 * @param {string} i.color - the hex code to use for the foreground color
	 * @param {number} i.width - the width of the canvas
	 * @param {number} i.height - the height of the canvas
	 * @param {boolean} i.fullwindow - is the canvas full screen?
	 * @param {boolean} i.transparent - is the canvas transparent?
	 * @param {number} i.scale - how much to scale the pixels by
	 */
	function Canvas(container,i){

		if(typeof container!=="object") return;
		if(!i) i = {};

		// Define default values
		this.canvas = '';
		this.c = '';
		this.wide = 0;
		this.tall = 0;
		this.fullwindow = false;
		this.fullscreen = false;
		this.transparent = false;
		this.color = "";
		this.background = "rgb(255,255,255)";
		this.events = {resize:""};	// Let's add some default events
		this.logging = false;
		this.scale = 1;

		// Add options to detect for older IE
		this.ie = false;
		this.excanvas = (typeof G_vmlCanvasManager != 'undefined') ? true : false;
		/*@cc_on
		this.ie = true
		@*/

		// Overwrite defaults with variables passed to the function
		var n = "number";
		var t = "string";
		var b = "boolean";
		if(is(i.logging,b)) this.logging = i.logging;
		if(is(i.background,t)) this.background = i.background;
		if(is(i.color,t)) this.color = i.color;
		if(is(i.width,n)) this.wide = i.width;
		if(is(i.height,n)) this.tall = i.height;
		if(is(i.fullwindow,b)) this.fullwindow = i.fullwindow;
		if(is(i.transparent,b)) this.transparent = i.transparent;
		if(is(i.scale,n)) this.scale = i.scale;
	
		this.log = new Logger({'id':'Canvas','logging':this.logging});

		this.log.message('Canvas',container,this.wide,this.tall);

		// Construct the <canvas> container
		this.container = S(container);
		this.log.message('Container width',this.container.width(),this.container[0],container);

		this.origcontainer = this.container[0].outerHTML;
		if(this.container[0].nodeName!=="DIV") this.container = this.container.replaceWith('<div></div>');

		if(this.container.length == 0){
			this.log.error('No valid container provided');
			return;
		}
		this.container.css({'position':'relative','width':this.wide,'height':this.tall});
		// We'll need to change the sizes when the window changes size
		var _obj = this;
		root.addEventListener('resize',function(e){ _obj.resize(); });

		// If the Javascript function has been passed a width/height
		// those take precedence over the CSS-set values
		if(this.wide > 0) this.container.css({'width':this.wide+'px'});
		this.wide = this.container.width();
		if(this.tall > 0) this.container.css({'height':this.tall+'px'});
		this.tall = this.container.height();
	
		// Add a <canvas> to it
		this.container.html('<div class="canvasholder"><canvas class="canvas" style="display:block;font:inherit;"></canvas></div>');
		this.containerbg = this.container.css('background');
		this.canvasholder = this.container.find('.canvasholder');
		this.canvas = this.container.find('canvas');
		this.canvasholder.css({'position':'relative'});
		this.canvas.css({'position':'absolute'});
		this.c = this.canvas[0];
		// For excanvas we need to initialise the newly created <canvas>
		if(this.excanvas) this.c = G_vmlCanvasManager.initElement(this.c);

		if(this.c && this.c.getContext){
			this.ctx = this.c.getContext('2d');
			this.setWH(this.wide,this.tall);
			this.ctx.clearRect(0,0,this.wide*this.scale,this.tall*this.scale);
			this.ctx.beginPath();
			var fs = 16;
			this.ctx.font = fs+"px sans-serif";
			this.ctx.fillStyle = 'rgb(0,0,0)';
			this.ctx.lineWidth = 1.5;
			var loading = 'Loading graph...';
			this.ctx.fillText(loading,(this.wide-this.ctx.measureText(loading).width)/2,(this.tall-fs)/2);
			this.ctx.fill();
		}

		// Bind events
		this.canvas.on("mousedown",{me:this}, function(e){ e.data.me.trigger("mousedown",{event:e}); });
		this.canvas.on("mousemove",{me:this}, function(e){ e.data.me.trigger("mousemove",{event:e}); });
		this.canvas.on("mouseup",{me:this}, function(e){ e.data.me.trigger("mouseup",{event:e}); });
		this.canvas.on("mouseover",{me:this}, function(e){ e.data.me.trigger("mouseover",{event:e}); });
		this.canvas.on("mouseleave",{me:this}, function(e){ e.data.me.trigger("mouseleave",{event:e}); });
		this.canvasholder.on("wheel",{me:this}, function(e){ e.data.me.trigger("wheel",{event:e}); });
		if('ontouchstart' in document.documentElement){
			//var ongoingTouches = [];
			//function ongoingTouchIndexById(idToFind){ for (var i = 0; i < ongoingTouches.length; i++){ var id = ongoingTouches[i].identifier; if(id == idToFind){ return i; } } return -1; }
			//function copyTouch(touch){ return { identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY }; }
			function updateEvent(e,touches){
				var el = e.currentTarget;
				var oe = clone(e.originalEvent);
				var x = [];
				var y = [];
				for(var i = 0; i < touches.length; i++){ x.push(touches[i].pageX); y.push(touches[i].pageY); }
				oe.layerX = G.mean(x)-el.offsetLeft;
				oe.layerY = G.mean(y)-el.offsetTop;
				oe.offsetX = el.offsetLeft;
				oe.offsetY = el.offsetTop;
				var bRect = document.body.getBoundingClientRect();
				var rect = el.getBoundingClientRect();
				oe.layerX -= (rect.left-bRect.left);
				oe.layerY -= (rect.top-bRect.top);
				return oe;
			}
			var olddist = null;
			this.canvasholder.on("touchstart",{me:this}, function(e){
				var ev = e.originalEvent;
				ev.preventDefault();
				olddist = null;
				var touches = ev.touches;
				if(touches && touches.length==1){
					// One touch maps to pan (mousedown)
					e.originalEvent = updateEvent(e,touches);
					e.originalEvent.which = 1;
					e.data.me.trigger("mousedown",{event:e});
					e.data.me.trigger("mouseover",{event:e});
				}
			});
			var lastevent = null;
			this.canvasholder.on("touchmove",{me:this}, function(e){
				e.originalEvent.preventDefault();
				var g = e.data.me;
				var touches = e.originalEvent.touches;

				var m = (touches ? touches.length:0);
				e.originalEvent = updateEvent(e,touches);

				// Keep a copy of the event for the touchend event
				lastevent = e.originalEvent;
				if(typeof g.updating!=="boolean") g.updating = false;
				if(!g.updating){
					if(m == 1){
						// One touch maps to pan (mousemove)
						e.originalEvent.which = 1;
						g.trigger("mousemove",{event:e});
					}else if(m == 2){
						var dist = Math.hypot(touches[0].pageX - touches[1].pageX,touches[0].pageY - touches[1].pageY);
						// Multi-touch maps to zoom (wheel)
						e.originalEvent.deltaY = (olddist ? (dist > olddist ? -1 : 1):-1);
						if(Math.abs(dist-olddist) > 4){
							g.trigger("wheel",{event:e,'speed':0.95,'update':false});
							olddist = dist;
						}
					}
				}
			});
			this.canvasholder.on("touchend",{me:this}, function(e){
				var ev = e.originalEvent;
				ev.preventDefault();
				var touches = ev.touches;
				var event = e;
				if(touches){
					// One touch maps to pan (mousedown)
					if(touches.length > 0) e.originalEvent = updateEvent(e,touches);
					e.originalEvent.which = 1;
				}else event = lastevent;
				e.data.me.trigger("mouseup",{event:event});
			});
		}
		if(fullScreenApi.supportsFullScreen){
			document.addEventListener(fullScreenApi.fullScreenEventName, function(event){
				_obj.fullscreen = (_obj.container[0] == fullScreenApi.element());
			});
		}
	}

	/**
	 * @desc Attach a handler to an event for the Canvas object
	 * @usage canvas.on(eventType[,eventData],handler(eventObject));
	 * @usage canvas.on("resize",function(e){ console.log(e); });
	 * @usage canvas.on("resize",{me:this},function(e){ console.log(e.data.me); });
	 * @param {string} ev - the event type
	 * @param {object} e - any properties to add to the output as e.data
	 * @param {function} fn - a callback function
	 */
	Canvas.prototype.on = function(ev,e,fn){
		if(typeof ev!="string") return this;
		if(is(fn,"undefined")){
			fn = e;
			e = {};
		}else{
			e = {data:e};
		}
		if(typeof e!="object" || typeof fn!="function") return this;
		if(this.events[ev]) this.events[ev].push({e:e,fn:fn});
		else this.events[ev] = [{e:e,fn:fn}];
		return this;
	};

	/**
	 * @desc Trigger a defined event with arguments. This is for internal-use to be sure to include the correct arguments for a particular event
	 */
	Canvas.prototype.trigger = function(ev,args){
		if(typeof ev != "string") return;
		if(typeof args != "object") args = {};
		var o = [];
		if(typeof this.events[ev]=="object"){
			for(var i = 0 ; i < this.events[ev].length ; i++){
				var e = G.extend(this.events[ev][i].e,args);
				if(typeof this.events[ev][i].fn == "function") o.push(this.events[ev][i].fn.call(this,e));
			}
		}
		if(o.length > 0) return o;
	};

	/**
	 * @desc Copy to the <code>canvas</code> clipboard
	 */
	Canvas.prototype.copyToClipboard = function(){
		var x = Math.min(this.wide,this.ctx.canvas.clientWidth)*this.scale;
		var y = Math.min(this.tall,this.ctx.canvas.clientHeight)*this.scale;
		this.log.message('copyToClipboard',x,y,this);
		if(x > 0 && y > 0){
			this.clipboard = this.ctx.getImageData(0, 0, x, y);
			this.clipboardData = this.clipboard.data;
		}
		return this;
	};

	/**
	 * @desc Paste from the <code>canvas</code> clipboard onto the canvas
	 */
	Canvas.prototype.pasteFromClipboard = function(){
		if(this.clipboardData){
			this.clipboard.data = this.clipboardData;
			this.ctx.putImageData(this.clipboard, 0, 0);
		}
		return this;
	};

	/**
	 * @desc Will toggle the <code>canvas</code> as a full screen element if the browser supports it.
	 */
	Canvas.prototype.toggleFullScreen = function(){
		this.log.message('toggleFullScreen',this.fullscreen);
		this.elem = this.container[0];
	
		if(this.fullscreen){
			if(document.exitFullscreen) document.exitFullscreen();
			else if(document.mozCancelFullScreen) document.mozCancelFullScreen();
			else if(document.webkitCancelFullScreen) document.webkitCancelFullScreen();
		}else{
			if(this.elem.requestFullscreen) this.elem.requestFullscreen();
			else if(this.elem.mozRequestFullScreen) this.elem.mozRequestFullScreen();
			else if(this.elem.webkitRequestFullscreen) this.elem.webkitRequestFullscreen();
			else if(this.elem.msRequestFullscreen) this.elem.msRequestFullscreen();
		}
		this.fullscreen = !this.fullscreen;
		return this;
	};

	/**
	 * @desc A function to be called whenever the <code>canvas</code> needs to be resized.
	 * @usage canvas.resize()
	 * @usage canvas.resize(400,250)
	 */
	Canvas.prototype.resize = function(w,h){
		if(!this.canvas) return;
		if(!w || !h){
			if(this.fullscreen) this.container.css({'background':'white'});
			else this.container.css({'background':this.containerbg});
		
			// We have to zap the width of the canvas to let it take the width of the container
			this.canvas.css({'width':'','height':'','max-width':'100%'});
			if(this.fullwindow){
				w = window.outerWidth;
				h = window.outerHeight;
				S(document).css({'width':w+'px','height':h+'px'});
			}else{
				// Set a max-width so that it can shrink
				this.container.css({'max-width':'100%'});
				w = this.container.outerWidth();
				h = this.container.outerHeight();
			}
		}
		if(w == this.wide && h == this.tall) return;
		this.setWH(w,h);
		// Trigger callback
		this.trigger("resize",{w:w,h:h});
	};

	/**
	 * @desc Internal function to update the internal variables defining the width and height.
	 */
	Canvas.prototype.setWH = function(w,h,ctx){
		this.log.message('setWH',w,h);
		if(!w || !h) return;
		var c = (typeof ctx=="undefined") ? this.c : ctx;
		// Set virtual pixel scale
		this.scale = window.devicePixelRatio;
		c.width = w*this.scale;
		c.height = h*this.scale;
		this.wide = w;
		this.tall = h;

		// Normalize coordinate system to use css pixels.
		if(this.ctx) this.ctx.scale(this.scale, this.scale);

		// Bug fix for IE 8 which sets a width of zero to a div within the <canvas>
		//if(this.ie && $.browser.version == 8) this.container.find('div').css({'width':w+'px','height':h+'px'});
		this.canvasholder.css({'width':w+'px','height':h+'px'});
		this.canvas.css({'width':w+'px','height':h+'px'});
	};

	/**
	 * @desc Function for making a graph object
	 * @usage mygraph = new Graph(id, data, options);
	 * @param {HTMLelement} id - the HTML element to attach the canvas to
	 * @param {object} options - contains any customisation options for the graph as a whole e.g. options = { xaxis:{ label:'Time (HJD)' },yaxis: { label: 'Delta (mag)' }};
	 */
	function Graph(element, options){

		if(!options) options = {};

		// Define some variables
		this.version = "0.3.2";
		if(typeof element!="object") return;
		this.marks = {};
		this.chart = {};
		this.options = {};
		this.timeout = {};
		this.selecting = false;
		this.panning = false;
		this.updating = false;
		this.events = [];
		this.lines = [];
		this.fontscale = 1;
		this.quicktime = 75;
		this.colours = ["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f","#ff7f00","#cab2d6","#6a3d9a","#ffff99","#b15928"];
		this.offset = {'x':0,'y':0};
		this.log = new Logger({'id':'Graph','logging':options.logging,'logtime':options.logtime});
		if(typeof Big==="undefined") this.log.error('ERROR','Unable to find big.js');

		this.log.time("Graph");
		this.log.message('init',element,typeof element,options);

		// Define the drawing canvas
		var opt = {};
		if(options.width) opt.width = options.width;
		if(options.height) opt.height = options.height;
		opt.logging = this.logging;

		this.canvas = new Canvas(element,opt);

		// Temporary canvases for drawing to
		this.paper = {
			'temp': {'c':document.createElement('canvas'),'ctx':''},  // Create a canvas for temporary work
			'data': {'c':document.createElement('canvas'),'ctx':''}   // Create a canvas to draw the data to
		};
		function setWH(p,w,h,s){
			p.width = w;
			p.height = h;
			p.scale = s;
			p.c.width = Math.round(w*s);
			p.c.height = Math.round(h*s);
			p.ctx = p.c.getContext('2d');
			p.ctx.scale(s,s);
			return p;
		}
		// Set canvas scaling for retina-type screens
		var s = window.devicePixelRatio;
		// Set properties of the temporary canvases
		for(var p in this.paper){
			if(this.paper[p]) this.paper[p] = setWH(this.paper[p],this.canvas.wide,this.canvas.tall,s);
		}

		// Bind events to the canvas
		this.canvas.on("resize",{me:this},function(ev){
			// Attach an event to deal with resizing the <canvas>
			var g = ev.data.me;
			var d = new Date();
			var s = window.devicePixelRatio;
			// Resize all the temporary canvases
			for(var p in g.paper){
				if(g.paper[p]) g.paper[p] = setWH(g.paper[p],g.canvas.wide,g.canvas.tall,s);
			}
			g.setOptions().defineAxis("x").setChartOffset().resetDataStyles().redraw({'update':true,'callback':function(){ this.trigger("resize",{event:ev.event}); }});
			this.log.message("Total until end of resize:" + (new Date() - d) + "ms");
		}).on("mousedown",{me:this},function(ev){
			var event,g,x,y,s,d,t,i,ii,a,m,ds;
			event = ev.event.originalEvent;
			g = ev.data.me;	// The graph object
			if(event.which!=1) return;	// Only zoom on left click
			// Check if there is a data point at the position that the user clicked.
			x = event.layerX;
			y = event.layerY;
			ds = g.dataAtMousePosition(x,y);
		
			// No data (but the alt key is pressed) so we'll start the zoom selection
			if(g.within(x,y) && g.options.zoomable){
				g.selectfrom = [x,y];
				g.selectto = clone(g.selectfrom);
				if(event.altKey) g.selecting = true;
				else g.panning = true;
				if(g.coordinates) g.coordinates.css({'display':'none'});
			}

			// Loop over the series that match
			m = [];
			for(s = 0; s < ds.length; s++){
				d = ds[s].split(":");
				if(d && d.length == 3){
					// This is a data point so we'll trigger the clickpoint event
					t = (d[0]);
					i = parseInt(d[1]);
					ii = g.getPixPos(x,y);
					m.push({'series':t,'n':i,'point':g.marks[t].data[i],'title':g.marks[t].title,'color':g.marks[t].color,'xpix':ii[0],'ypix':ii[1]});
				}
			}
			a = g.trigger("clickpoint",{event:event,matches:m});
			return true;
		}).on("mousemove",{me:this},function(ev){
			var event,g,x,y,d,t,i,ii,a,m,ds;
			event = ev.event.originalEvent;
			disableScroll();
			if(!event) return;
			g = ev.data.me;	// The graph object
			if(g.updating) return;
			g.updating = true;
			x = event.layerX;
			y = event.layerY;
			// Attach hover event
			if(!g.selecting && !g.panning && !g.timeout.wheel){
				ds = g.dataAtMousePosition(event.offsetX,event.offsetY);
				g.highlight(ds);
				m = [];
				for(var s = 0; s < ds.length; s++){
					d = ds[s].split(":");
					if(d && d.length == 3){
						t = d[0];
						i = parseInt(d[1]);
						ii = g.getPixPos(x,y);
						m.push({'series':t,'n':i,'point':g.marks[t].data[i],'title':g.marks[t].title,'color':g.marks[t].color,'xpix':ii[0],'ypix':ii[1]});
					}
				}
				a = g.trigger("hoverpoint",{event:event,matches:m});
				if(g.events.mousemove){
					var pos = g.pixel2data(x,y);
					g.trigger("mousemove",{event:event,x:pos.x,y:pos.y});
				}
			}
			if(g.selecting || g.panning){
				if(g.within(x,y)){
					g.selectto = [x,y];
					var to = clone(g.selectto);
					var from = clone(g.selectfrom);
				
					if(g.options.zoommode == "x"){
						from[1] = g.getPos("y",g.y.min);
						to[1] = g.getPos("y",g.y.max);
					}
					if(g.options.zoommode == "y"){
						from[0] = g.getPos("x",g.x.min);
						to[0] = g.getPos("x",g.x.max);
					}
					if(g.selecting){
						g.canvas.pasteFromClipboard();
						g.canvas.ctx.beginPath();
						// Draw selection rectangle
						g.canvas.ctx.fillStyle = g.options.grid.colorZoom || 'rgba(0,0,0,0.1)';
						g.canvas.ctx.lineWidth = g.options.grid.border;
						g.canvas.ctx.fillRect(from[0]-0.5,from[1]-0.5,to[0]-from[0],to[1]-from[1]);
						g.canvas.ctx.fill();
						g.canvas.ctx.closePath();
					}
					if(g.panning) g.panBy(to[0]-from[0], to[1]-from[1],{'quick':(g.log.metrics.draw.av >= g.quicktime)});
				}
			}
			g.updating = false;
			return true;
		}).on("mouseleave",{me:this},function(ev){
			var g = ev.data.me;
			var event = ev.event.originalEvent;
			if(event.offsetX >= g.options.width) event.layerX = g.options.width;
			if(event.offsetX <= 0) event.layerX = 0;
			if(event.offsetY >= g.options.height) event.layerY = g.options.height;
			if(event.offsetY <= 0) event.layerY = 0;
			g.canvas.trigger('mousemove',{event:event});
			g.canvas.trigger('mouseup',{event:event});
			enableScroll();
		}).on("mouseup",{me:this},function(ev){
			var g = ev.data.me;	 // The graph object
			var event = ev.event.originalEvent;
			var r;
			if(g.selecting){
				r = g.getDataRange(g.selectfrom[0],g.selectto[0],g.selectfrom[1],g.selectto[1]);

				// No difference between points - reset view
				if(r[0]==r[1] && r[2]==r[3]) g.zoom();
				else{
					if(g.options.zoommode == "x"){
						// If we are only zooming in the x-axis we don't change the y values
						r[2] = g.y.data.min;
						r[3] = g.y.data.max;
					}
					if(g.options.zoommode == "y"){
						// If we are only zooming in the y-axis we don't change the x values
						r[0] = g.x.data.min;
						r[1] = g.x.data.max;
					}
					g.zoom(r,{'update':true});
				}
				g.selecting = false;
			}
			if(g.panning){
				var dx = event.layerX-g.selectfrom[0];
				var dy = event.layerY-g.selectfrom[1];
				// Work out the new range
				r = g.getDataRange(g.chart.left-dx, g.chart.left+g.chart.width-dx, g.chart.top-dy, g.chart.top+g.chart.height-dy);
				// Reset the offsets
				g.offset.x = 0;
				g.offset.y = 0;
				// Zoom to new range
				g.zoom(r,{});
				g.panning = false;
			}
			g.canvas.pasteFromClipboard();
			g.trigger("mouseup",{event:event});
			return true;
		}).on("wheel",{me:this,options:options},function(ev){
			var oe,g,c,co,f,s;
			oe = ev.event.originalEvent;
			g = ev.data.me;
			if(g.timeout.wheel) clearTimeout(g.timeout.wheel);
			if(!g.updating){
				g.updating = true;
				c = {'x':oe.layerX,'y':oe.layerY};
				co = g.coordinates;
				if(co && co[0] == oe.target){ c.x += co[0].offsetLeft; c.y += co[0].offsetTop; }
				f = (ev.speed || (1 - Math.min(40,Math.abs(oe.deltaY))/250));
				s = (oe.deltaY > 0 ? 1/f : f);
				oe.update = ev.update;
				if(co) co.css({'display':''});
				g.zoom([c.x,c.y],{'quick':(g.log.metrics.draw.av >= g.quicktime),'scalex':(oe.layerX > g.chart.left ? s : 1),'scaley':(oe.layerY < g.chart.top+g.chart.height ? s : 1),'update':false});
				g.trigger('wheel',{event:oe});
				g.updating = false;
			}
			// Set a timeout to trigger a wheelstop event
			g.timeout.wheel = setTimeout(function(e){ g.canvas.trigger('wheelstop',{event:e}); },100,{event:oe});
		}).on("wheelstop",{me:this,options:options},function(ev){
			var g = ev.data.me;
			g.updating = false;
			g.resetDataStyles();
			g.redraw({
				'update':true,
				'callback': function(){
					this.timeout.wheel = undefined;
					this.trigger('wheelstop',{event:ev.event});
				}
			});
		});

		// Extend the options with those provided by the user
		this.setOptions(options);
	
		// Finally, set the data and update the display
		this.updateData();

		this.log.time("Graph");
		return this;
	}

	/**
	 * @desc Make the graph fullscreen or not
	 */
	Graph.prototype.toggleFullScreen = function(){
		this.canvas.toggleFullScreen();
		return this;
	};

	/**
	 * @desc Attach a handler to an event for the Graph object
	 * @param {string} ev - the event type
	 * @param {object} e - any data to add to e.data
	 * @param {function} fn - the callback function
	 * @usage graph.on(eventType[,eventData],handler(eventObject));
	 * @usage graph.on("resize",function(e){ console.log(e); });
	 * @usage graph.on("resize",{me:this},function(e){ console.log(e.data.me); });
	 */
	Graph.prototype.on = function(ev,e,fn){
		if(typeof ev!="string") return this;
		if(typeof fn=="undefined"){ fn = e; e = {}; }
		else{ e = {data:e}; }
		if(typeof e!="object" || typeof fn!="function") return this;
		if(this.events[ev]) this.events[ev].push({e:e,fn:fn});
		else this.events[ev] = [{e:e,fn:fn}];
		return this;
	};

	/**
	 * @desc Trigger a defined event with arguments. This is for internal-use to be sure to include the correct arguments for a particular event
	 * @param {string} ev - the event to trigger
	 * @param {object} args - any arguments to add to the event
	 */
	Graph.prototype.trigger = function(ev,args){
		if(typeof ev != "string") return;
		if(typeof args != "object") args = {};
		var o = [];
		if(typeof this.events[ev]=="object"){
			for(var i = 0 ; i < this.events[ev].length ; i++){
				var e = G.extend(this.events[ev][i].e,args);
				if(typeof this.events[ev][i].fn == "function") o.push(this.events[ev][i].fn.call(this,e));
			}
		}
		if(o.length > 0) return o;
	};

	/**
	 * @desc Set Options
	 * @param {object} options - set any options
	 * @param {number} options.width - the width of the graph in pixels
	 * @param {number} options.height - the height of the graph in pixels
	 * @param {object} options.grid - properties of the grid
	 * @param {boolean} options.grid.show - Do we show the grid?
	 * @param {number} options.grid.border - the border width in pixels
	 * @param {string} options.grid.color - the color of the border
	 */
	Graph.prototype.setOptions = function(options){
		options = options || {};
		if(typeof this.options!="object") this.options = {};
		// Set the width and height
		this.options.width = parseInt(getStyle(this.canvas.container[0], 'width'), 10);
		this.options.height = parseInt(getStyle(this.canvas.container[0], 'height'), 10);

		// Add user-defined options
		//this.options = Object.assign(this.options, options);
		this.options = G.deepExtend(this.options, options);
		// Set defaults for options that haven't already been set
		if(typeof this.options.grid!=="object") this.options.grid = {};
		if(typeof this.options.grid.show!=="boolean") this.options.grid.show = false;
		if(typeof this.options.grid.border!=="number") this.options.grid.border = 1;
		if(typeof this.options.grid.color!=="string") this.options.grid.color = "#888888";
		if(typeof this.options.labels!=="object") this.options.labels = {};
		if(typeof this.options.labels.color!=="string") this.options.labels.color = "black";
		if(typeof this.options.padding!=="number") this.options.padding = 0;
		var k,a,axes;
		// Default axis types see https://vega.github.io/vega/docs/scales/#types
		// We support linear/log/utc/time so far
		var axisdefaults = {
			'type': { 'type': 'string', 'value': ['utc','linear']},
			'label': { 'type':'string', 'value':[''] },
			'fit': { 'type': 'boolean', 'value': [false] },
			'padding': { 'type': 'number', 'value': [0] }
		};
		axes = ['xaxis','yaxis'];
		for(k in axisdefaults){
			//if(typeof this.options[axes[a]]!=="object") this.options[axes[a]] = {};
			if(axisdefaults[k]){
				for(a = 0; a < axes.length; a++){
					if(!this.options[axes[a]]) this.options[axes[a]] = {};
					if(typeof this.options[axes[a]][k]!==axisdefaults[k].type) this.options[axes[a]][k] = axisdefaults[k].value[(axisdefaults[k].value.length==axes.length ? a : 0)];
				}
			}
		}
		if(typeof this.options.zoommode!=="string") this.options.zoommode = "both";
		if(typeof this.options.zoomable!=="boolean") this.options.zoomable = true;
		return this;
	};

	/**
	 * @desc Parse a dataset converting numbers and dates
	 * @param {object} data - the input dataset
	 * @param {array} data.data - the dataset as a 1D array of objects e.g. data.data[i][key]
	 * @param {object} data.parse - each key in the data has a string defining the format e.g. "number", "string", "date", "boolean"  
	 * @param {object} opts - options to customise parsing
	 * @param {boolean} opts.xaxis.highprecision - Do we need to use high precision numbers for dates? 
	 */
	function parseData(data,opts){
		var i,key,v,format,s;
		var lookup = {};
		// Is the xaxis highprecision? We'll cheat here by assuming that only the 
		// xaxis can have this flag and it only applies to format=date
		if(typeof opts.xaxis.highprecision!=="boolean") opts.xaxis.highprecision = false;
		// Parse the data
		for(key in data.parse){
			if(data.parse[key]){
				format = data.parse[key];
				for(i = 0 ; i < data.data.length; i++){
				// Loop over each column in the line
					v = data.data[i][key];
			
					if(format!="string"){
						// "number", "boolean" or "date" https://github.com/vega/vega/wiki/Data#-csv
						if(format=="number"){
							v = parseFloat(v);
						}else if(format=="date"){
							if(v==null || v=="") v = parseFloat(v);
							else{
								if(opts.xaxis.highprecision){
									// If the 'highprecision' flag is set we treat this as a Big number.
									// Convert to integer seconds since the epoch as a string
									s = Math.floor(new Date(v.replace(/(^"|"$)/,"")).getTime()/1000)+'';
									// Extract anything less than seconds and add it back
									var m = v.match(/\.([0-9]+)/);
									if(m && m.length == 2) s += m[0];
									v = Num(s);	// Convert to Big number (inside our wrapper)
								}else{
									// Otherwise we will just use the date as a standard number
									v = new Date(v.replace(/(^"|"$)/,"")).getTime()/1000;
								}
							}
						}else if(format=="boolean"){
							if(v=="1" || v=="true" || v=="Y") v = true;
							else if(v=="0" || v=="false" || v=="N") v = false;
							else v = null;
						}
					}
					lookup[data.data[i][key]] = v;
					data.data[i][key] = v;
				}
			}
		}
		return data;
	}

	/**
	 * @desc Add datasets to the graph using parseData() for each one
	 * @param {object} datasets - each dataset has a unique key to refer to it.
	 */
	Graph.prototype.addDatasets = function(datasets){
		this.log.time('addDatasets');
		if(!this.datasets) this.datasets = {};
		for(var id in datasets){
			if(datasets[id]){
				if(!this.datasets[id]){
					this.datasets[id] = parseData(clone(datasets[id]),this.options);
				}
			}
		}
		this.log.time('addDatasets');
		return this;
	};

	/**
	 * @desc Only send one dataset at a time with this function. If an index is provided use it otherwise add sequentially. If a dataset already exists we don't over-write.
	 * @param {object} data - one set of marks to add
	 * @param {number} idx - the index for this set of marks
	 * @param {object} original - a copy of the original properties for this mark set
	 * @param {boolean} original.clip - are the marks clipped to the chart area?
	 * @param {string} original.description - a text-based description for the mark set (doesn't have to be unique).
	 * @param {object} original.encode - VEGA properties for enter, update, and hover e.g. { enter: {…}, update: {…} }
	 * @param {object} original.from - the key for the source of this dataset { data: "62a5a561-c30a-4047-9a78-5c55ab563031" }
	 * @param {boolean} original.include - does this mark set get included in the plot? Useful for turning on/off.
	 * @param {string} original.name - the unique key for this mark set e.g. "69119b81-e09d-47f5-aa44-3d718e5ab494-symbol"
	 * @param {string} original.type - the type of mark e.g. "symbol"
	 * @param {object} attr - some configuration attributes
	 * @param {function} attr.progress - a function called during the creation of the mark set
	 * @param {function} attr.success - a function that is called once the marks are all added
	 * @param {object} attr.this - set the context for the callback
	 */
	Graph.prototype.addMarks = function(data,idx,original,attr){
		var i,j,l,types,update;
		this.log.message('addMarks',idx);
		if(typeof idx!=="number"){
			if(typeof idx==="undefined"){
				// Create an idx
				for(i = 0; i < 200; i++){
					if(typeof this.marks[i]==="undefined"){
						idx = i;
						i = 100;
					}
				}
			}
		}
		this.originaldata = original;
		attr.name = original.name;

		if(this.marks[idx]) this.log.warning('addMarks','refusing to overwrite existing dataset at '+idx,this.marks[idx],data);
		else {
			this.marks[idx] = parseData(data,this.options);

			// Set the default to show the dataset
			if(typeof this.marks[idx].show!=="boolean") this.marks[idx].show = true;
			if(typeof this.marks[idx].include!=="boolean") this.marks[idx].include = true;
			l = this.marks[idx].data.length;
			this.marks[idx].mark = new Array(l);

			if(!this.marks[idx].type) this.marks[idx].type = "symbol";
			if(!this.marks[idx].format) this.marks[idx].format = { };

			if(this.marks[idx].symbol && !this.marks[idx].symbol.shape) this.marks[idx].symbol.shape = "circle";
			if(typeof this.marks[idx].format.size!=="number") this.marks[idx].format.size = 4;
			if(!this.marks[idx].format.stroke) this.marks[idx].format.stroke = this.colours[0];
			if(!this.marks[idx].format.strokeDash) this.marks[idx].format.strokeDash = [1,0];
			if(typeof this.marks[idx].format.strokeWidth!=="number") this.marks[idx].format.strokeWidth = 1;
			if(!this.marks[idx].format.fill) this.marks[idx].format.fill = this.colours[0];

			update = (typeof attr.progress==="function");
			types = ['symbol','rect','lines','area','rule','text','format'];
			// So that we can present a progress bar for big datasets,
			// we'll chunk up the processing into blocks of 5000
			function processChunk(attr){
				var t,max,chk;
				chk = 10000;
				max = Math.min(attr.marks.data.length,i+chk);
				for(i = attr.i; i < max; i++){
					// If we have sent an update function we'll process it as we go
					if(update && i > chk && i % Math.round(l/100) == 0) attr.attr.progress.call((attr.attr['this']||this),{'mark':original,'i':i,'total':attr.total});

					if(!attr.marks.mark[i]) attr.marks.mark[i] = {'props':{},'data':attr.marks.data[i]};

					for(j = 0; j < types.length; j++){
						t = types[j];
						if(typeof attr.marks.mark[i].props[t]!=="object" && attr.marks[t]) attr.marks.mark[i].props[t] = clone(attr.marks[t]);
					}
					// Should process all the "enter" options here
					if(attr.marks.enter){
						//console.log('enter',clone(attr.marks.encode.enter))
						attr.marks.mark[i] = attr.marks.enter.call(attr['this'],attr.marks.mark[i],attr.marks.encode.enter);
					}
				}
				attr.i = i;
				if(i < attr.marks.data.length){
					attr['this'].timeout.addMark = setTimeout(processChunk,100,attr);
				}else{
					if(typeof attr.attr.success==="function"){
						attr.attr.i = i;
						attr.attr.total = attr.total;
						attr.attr.success.call((attr.attr['this']||this),attr.attr);
					}
				}
			}
			this.timeout.addMark = processChunk({'this':this,'marks':this.marks[idx],'attr':attr,'i':0,'total':l});
		}
		return this;
	};

	/**
	 * @desc Update the data on the graph. This calls getGraphRange(), setChartOffset(), resetDataStyles() and redraw()
	 */
	Graph.prototype.updateData = function() {
		// Should process all the "update" options here;
		this.log.message('updateData',this.marks);
		this.getGraphRange().setChartOffset().resetDataStyles().redraw({'cancelable':false,'update':true});
	};

	/**
	 * @desc Get the graph ranges for both axes. This sets various properties such as datamin, datamax, and datarange for each axis before calling defineAxis() on each
	 */
	Graph.prototype.getGraphRange = function(){
		var d,i,j,k,max,axes,axis,v,domain,keepers;
		if(!this.x) this.x = {};
		if(!this.y) this.y = {};
		this.x = G.extend(this.x,{ min: 1e100, max: -1e100, log: (this.options.xaxis.type=="log"), label:{text:this.options.xaxis.label}, fit:this.options.xaxis.fit });
		this.y = G.extend(this.y,{ min: 1e100, max: -1e100, log: (this.options.yaxis.type=="log"), label:{text:this.options.yaxis.label}, fit:this.options.yaxis.fit });
	
		if(this.options.xaxis.type=="time" || this.options.xaxis.type=="utc") this.x.isDate = true;

		if(this.marks.length <= 0) return this;

		function calc(out,vs){
			if(typeof vs==="undefined") return out;
			out.min = Math.min(out.min);
			out.max = Math.max(out.max);
			for(var i = 0; i < vs.length; i++){
				v = vs[i];
				if(typeof v!=="undefined"){
					if(typeof v==="object") v = v.valueOf();
					if(v < out.min) out.min = v;
					if(v > out.max) out.max = v;
				}
			}
			return out;
		}

		axes = {
			'xaxis':'x',
			'yaxis':'y'
		};
		for(axis in axes){
			if(this.options[axis].range == "width" || this.options[axis].range == "height"){
				domain = this.options[axis].domain;
				v = [];
				// Build hash of which columns to keep
				keepers = {};
				if(domain.field) keepers[domain.field] = true;
				if(domain.fields){
					for(k = 0; k < domain.fields.length; k++) keepers[domain.fields[k]] = true;
				}
				// Loop over the datasets
				for(i in this.datasets){
					// If no domain is provided or one is and this is the correct dataset
					if(!domain || (domain && domain.data==i) || (domain.length && domain.length==2)){
						if(domain && domain.length && domain.length==2){
							this[axes[axis]].min = domain[0];
							this[axes[axis]].max = domain[1];
						}else{
							if(this.datasets[i].data){
								max = this.datasets[i].data.length;
								// Loop over the columns in the dataset
								for(j = 0; j < max ; j++){
									d = this.datasets[i].data[j];
									// Work out the values to include in the min/max calculation
									if(this.options[axis].domain){
										for(k in keepers){
											if(d[k]) v.push(d[k]);
										}
									}else v.push(d[axes[axis]]);
								}
							}else{
								this.log.message('no marks');
							}
						}
					}
				}

				// Calculate the range for this axis
				this[axes[axis]] = calc(this[axes[axis]],v);

				v = [];
				// Loop over the data
				for(i in this.marks){
					// If no domain is provided or one is and this is the correct dataset
					if(!this.options[axis].domain || (this.options[axis].domain && this.options[axis].domain.data==this.marks[i].id)){
						if(this.marks[i].mark && this.marks[i].include){
							max = this.marks[i].mark.length;
							for(j = 0; j < max ; j++){
								d = this.marks[i].mark[j].data;
								// Work out the values to include in the min/max calculation
								if(this.options[axis].domain){
									for(k in keepers){
										if(d[k]){
											v.push(d[k]);
										}
									}
								}else v.push(d[axes[axis]]);
							}
						}else{
							this.log.message('no marks');
						}
					}
				}
				this[axes[axis]] = calc(this[axes[axis]],v);			
			}
		}

		// Keep a record of the data min/max
		this.x.data = {'min':this.x.min,'max':this.x.max,'range':Num(this.x.max).minus(this.x.min).toValue()};
		this.y.data = {'min':this.y.min,'max':this.y.max,'range':Num(this.y.max).minus(this.y.min).toValue()};

		this.defineAxis("x");
		this.defineAxis("y");
		return this;
	};

	/**
	 * @desc Pan the graph.
	 * @param {number} dx - an amount to move by horizontally in pixels.
	 * @param {number} dy - an amount to move by vertically in pixels.
	 * @param {object} attr - configuration attributes
	 * @param {boolean} attr.quick - If set to true, we do a very quick draw of the data canvas rather than recalculate everything as that can be slow when there is a lot of data.
	 */
	Graph.prototype.panBy = function(dx,dy,attr){

		// Stop any existing processing
		if(this.timeout.redraw) clearTimeout(this.timeout.redraw);

		this.offset.x = dx;
		this.offset.y = dy;
		this.log.time('panBy');
		if(!attr) attr = {};
		if(attr.quick){
			this.clear();
			this.clear(this.paper.temp.ctx);
			this.drawAxes();
			var ctx = this.canvas.ctx;
			// Build the clip path
			ctx.save();
			ctx.beginPath();
			ctx.rect(this.chart.left,this.chart.top,this.chart.width,this.chart.height);	
			ctx.clip();
			ctx.drawImage(this.paper.data.c,this.offset.x,this.offset.y,this.paper.data.width,this.paper.data.height);
			ctx.restore();
			this.canvas.copyToClipboard();
		}else{
			// Update the graph
			this.setChartOffset().resetDataStyles();
			this.redraw({'update':false});
		}
		this.log.time('panBy');
		return this;
	};

	/**
	 * @desc Zoom the graph. We can zoom around a point or we can zoom to a defined region.
	 * @param {array} pos - if this is 2 elements we treat this as a zoom around a point [x,y]. If it is 4 elements we zoom to the defined range [xmin,xmax,ymin,ymax]. If no values are given we reset the view to the original data range.
	 * @param {boolean} attr.quick - if set to true, we do a very quick draw of the data canvas rather than recalculate everything as that can be slow when there is a lot of data.
	 * @param {number} attr.scale - a factor to zoom by (1==no zoom)
	 * @param {number} attr.scalex - a factor to zoom the x-axis by
	 * @param {number} attr.scaley - a factor to zoom the y-axis by
	 * @param {boolean} attr.update - whether redraw() does an update or not
	 */
	Graph.prototype.zoom = function(pos,attr){

		// Stop any existing processing
		if(this.timeout.redraw) clearTimeout(this.timeout.redraw);

		if(!attr) attr = {};
		if(attr.quick) this.log.time('zoom');
		if(!pos) pos = [];
		if(this.coordinates) this.coordinates.css({'display':'none'});
		// Zoom by a scale around a point [scale,x,y]
		var c,sx,sy,x,y;
		if(pos.length == 2){
			sx = sy = 0.8;
			if(attr.scale) sx = sy = attr.scale;
			if(attr.scalex) sx = attr.scalex;
			if(attr.scaley) sy = attr.scaley;
			if(attr.quick){
				// Scale the top left location
				this.paper.data.scale.x *= sx;
				this.paper.data.scale.y *= sy;
				var nwide = Math.round(this.canvas.wide/this.paper.data.scale.x);
				var ntall = Math.round(this.canvas.tall/this.paper.data.scale.y);
				// We use x,y below to draw the scaled image
				x = pos[0] * (1 - nwide/this.canvas.wide);
				y = pos[1] * (1 - ntall/this.canvas.tall);
			}
			// Find the center
			c = this.pixel2data(pos[0],pos[1]);
			pos = new Array(4);
			// Calculate the new zoom range
			pos[0] = c.x - sx*(c.x-this.x.min);
			pos[1] = c.x + sx*(this.x.max-c.x);
			if(this.y.log){
				pos[2] = Math.pow(10,G.log10(c.y) - sy*(G.log10(c.y) - G.log10(this.y.min)));
				pos[3] = Math.pow(10,G.log10(c.y) + sy*(G.log10(this.y.max) - G.log10(c.y)));
			}else{
				pos[2] = c.y - sy*(c.y-this.y.min);
				pos[3] = c.y + sy*(this.y.max-c.y);
			}
		}

		// Zoom into a defined region [x1,x2,y1,y2]
		if(pos.length == 4){
			if(typeof pos[0]!="number" || typeof pos[1]!="number" || typeof pos[2]!="number" || typeof pos[3]!="number") pos = [];
			else{
				// Re-define the axes
				this.defineAxis("x",pos[0],pos[1]);
				this.defineAxis("y",pos[2],pos[3]);
			}
		}

		// No parameters set so reset the view
		if(!attr.quick && pos.length == 0){
			this.x.min = this.x.data.min;
			this.x.max = this.x.data.max;
			this.y.min = this.y.data.min;
			this.y.max = this.y.data.max;
			this.defineAxis("x");
			this.defineAxis("y");
		}

		this.setChartOffset();
		if(!attr.quick){
			this.resetDataStyles().redraw({'update':typeof attr.update==="boolean" ? attr.update : true});
		}else{
			this.clear();
			this.clear(this.paper.temp.ctx);
			this.drawAxes();
			var ctx = this.canvas.ctx;
			// Build the clip path
			ctx.save();
			ctx.beginPath();
			ctx.rect(this.chart.left,this.chart.top,this.chart.width,this.chart.height);	
			ctx.clip();
			ctx.drawImage(this.paper.data.c,x,y,Math.round(this.canvas.wide/this.paper.data.scale.x),Math.round(this.canvas.tall/this.paper.data.scale.y));
			ctx.restore();
		}

		if(attr.quick) this.log.time('zoom');

		return this;
	};

	/**
	 * @desc Add some padding to an axis.
	 * @param {string} t - the axis to add the padding to e.g. "x" or "y"
	 * @param {number} p - the number of pixels to add as padding to this axis
	 */
	Graph.prototype.addAxisPadding = function(t,p){

		// Update the range
		this[t].range = Num(this[t].max).minus(this[t].min).toValue();

		// First we need to calculate the log min/max/range
		if(this[t].log){
			// Adjust the low and high values for log scale
			this[t].logmax = G.log10(this[t].max);
			this[t].logmin = (this[t].min <= 0) ? this[t].logmax-2 : G.log10(this[t].min);
			this[t].logrange = this[t].logmax-this[t].logmin;
		}

		if(this[t].min < 1e100){
			// Work out the number of pixels for the chart dimension e.g. width - padding*2
			var dim = (t=="x" ? this.chart.width : this.chart.height)-(p*2);
			// Work out the data range to add/subtract
			var d = p*this[t][(this[t].log ? 'log':'')+'range']/dim;
			if(this[t].log){
				this[t].logmin -= d;
				this[t].logmax += d;
				this[t].min = Math.pow(10,this[t].logmin);
				this[t].max = Math.pow(10,this[t].logmax);
			}else{
				this[t].min -= d;
				this[t].max += d;
			}
			// Update range
			this[t].range = Num(this[t].max).minus(this[t].min).toValue();
		}
		return this;
	};

	/**
	 * @desc Convert a pixel-based bounding box into a data-based bounding box
	 */
	Graph.prototype.getDataRange = function(x1,x2,y1,y2){
		var c1 = this.pixel2data(x1,y1);
		var c2 = this.pixel2data(x2,y2);
		return [Math.min(c1.x,c2.x),Math.max(c1.x,c2.x),Math.min(c1.y,c2.y),Math.max(c1.y,c2.y)];
	};

	/**
	 * @desc Return the pixel value for a data value on a given axis
	 * @param {string} t - the axis e.g. "x" or "y"
	 * @param {number} c - the value
	 */
	Graph.prototype.getPos = function(t,c){
		if(!this[t]) return;
		var k,mn,mx,rn,v,off,dim;
		if(typeof c==="object"){
			if(!c.scale){
				if(typeof c==="object" && c.type=="Num"){
					v = c.toValue();
				}else{
					v = 0;
					if(c.field && c.field.group && (c.field.group=="width" || c.field.group=="height")) v = this[t].max; 
					if(c.value == 0) v = this[t].min;
				}
			}else v = c.value;
		}else v = c;
		k = (this[t].log) ? 'log':'';
		if(this[t].log) v = G.log10(v);
		mn = this[t][k+'min'];
		mx = this[t][k+'max'];
		rn = this[t][k+'range'];
		off = (t=="x" ? this.chart.left : this.chart.bottom);
		dim = (t=="x" ? this.chart.width : this.chart.height);
		if(t=="y") return (this.offset[t]||0)+this.options.height-(this.chart.bottom + dim*((v-mn)/rn));
		else return (this.offset[t]||0)+(this[t].dir=="reverse" ? off + dim*((mx-v)/(rn)) : off + dim*((v-mn)/rn));
	};

	/**
	 * @desc For an input data value find the pixel locations
	 * @param {number} x - the horizontal axis value
	 * @param {number} y - the vertical axis value
	 */
	Graph.prototype.getPixPos = function(x,y){ return [this.getPos("x",x),this.getPos("y",y)]; };

	/**
	 * @desc Are the x,y pixel coordinates in the displayed chart area?
	 * @param {number} x - horizontal pixel value
	 * @param {number} y - vertical pixel value
	 */
	Graph.prototype.within = function(x,y){
		if(x > this.chart.left && y < this.chart.top+this.chart.height) return true;
		return false;
	};

	/**
	 * @desc Provide the pixel coordinates (x,y) and return the data-space values {x:number,y:number}
	 * @param {number} x - horizontal pixel value
	 * @param {number} y - vertical pixel value
	 */
	Graph.prototype.pixel2data = function(x,y){
		// x-axis
		x = this.x.min + ((x-this.chart.left)/this.chart.width)*this.x.range;
		// y-axis
		if(this.y.log) y = Math.pow(10,this.y.logmin + (1-(y-this.chart.top)/this.chart.height)*this.y.logrange);
		else y = this.y.min + (1-(y-this.chart.top)/this.chart.height)*this.y.range;
		return {x:x,y:y};
	};

	/**
	 * @desc An array of mark sets that match with the pixel position
	 * @param {number} x - horizontal pixel value
	 * @param {number} y - vertical pixel value
	 */
	Graph.prototype.dataAtMousePosition = function(x,y){
		x = Math.round(x*this.canvas.scale);
		y = Math.round(y*this.canvas.scale);
		if(x >= 0 && y >= 0 && x < this.canvas.c.width && y < this.canvas.c.height && this.lookup[x] && this.lookup[x][y]) return this.lookup[x][y];
		else this.canvas.canvas.css({'cursor':''});
		return [];
	};

	/**
	 * @desc Set the canvas styles
	 * @param {context} ctx - a canvas context to apply the styles to
	 * @param {object} datum - an object for the mark datum
	 * @param {object} datum.props.format - formatting options for this datum
	 * @param {string} datum.props.format.fill - the fill colour
	 * @param {number} datum.props.format.fill - an index in the colour pallette
	 * @param {number} datum.props.format.fillOpacity - the opacity of the fill
	 * @param {string} datum.props.format.stroke - the stroke colour
	 * @param {string} datum.props.format.strokeOpacity - the stroke opacity
	 * @param {string} datum.props.format.strokeCap - the cap for the stroke e.g. "square"
	 * @param {array} datum.props.format.strokeDash - the dash styles
	 * @param {string} datum.props.format.fontSize - the font size
	 * @param {string} datum.props.format.baseline - the textBaseline
	 * @param {string} datum.props.format.align - the alignment
	 */
	Graph.prototype.setCanvasStyles = function(ctx,datum){
		if(!datum) return this;
		var f = datum.props.format;
		var fill = (typeof f.fill==="string" ? f.fill : (typeof f.fill==="number" ? this.colours[f.fill % this.colours.length]:'#000000'));
		if(datum.props.format.fillOpacity) fill = hex2rgba(fill,f.fillOpacity);
		ctx.fillStyle = fill;
		var stroke = (typeof f.stroke==="string" ? f.stroke : (typeof f.stroke==="number" ? this.colours[f.stroke % this.colours.length]:'#000000'));
		if(f.strokeOpacity) stroke = hex2rgba(stroke,f.strokeOpacity);
		ctx.strokeStyle = stroke;
		ctx.lineWidth = (typeof f.strokeWidth==="number" ? f.strokeWidth : 0.8);
		ctx.lineCap = (f.strokeCap || "square");
		ctx.setLineDash(f.strokeDash ? f.strokeDash : [1,0]);
		if(f.fontSize) ctx.font = buildFont(f);
		if(f.baseline) ctx.textBaseline = f.baseline;
		if(f.align) ctx.textAlign = f.align;
		return this;
	};

	/**
	 * @desc Highlight a particular set of marks (up to 10). This can also trigger a tooltip.
	 * @param {array} ds - an array of "marksetid:markid:weight" mark references
	 */
	Graph.prototype.highlight = function(ds){
		if(this.selecting) return;	// If we are panning we don't want to highlight symbols
		if(this.lookup && ds && ds.length > 0){
			// We want to put the saved version of the canvas back
			this.canvas.pasteFromClipboard();
			var d,t,i,w,clipping,typ,mark,ctx,n,s,val,top,topmark,series;
			ctx = this.canvas.ctx;
			top = -1;

			// Only highlight the first 10 matches
			n = Math.min(10,ds.length);
			for(s = 0; s < n; s++){
				d = ds[s].split(":");
				t = d[0];
				i = d[1];
				w = d[2];
				clipping = false;
				typ = this.marks[t].type;
				if(this.marks[t].encode.hover && this.marks[t].interactive){
					if(typ=="line" || typ=="rect" || typ=="area" || typ=="rule"){
						if(this.marks[t].clip){
							clipping = true;
							// Build the clip path
							ctx.save();
							ctx.beginPath();
							ctx.rect(this.chart.left,this.chart.top,this.chart.width,this.chart.height);
							ctx.clip();
						}
					}
					if(typ=="line" || typ=="symbol" || typ=="rect" || typ=="area" || typ=="rule" || typ=="text"){
						// Update the mark if necessary
						mark = (typeof this.marks[t].hover==="function" ? this.marks[t].hover.call(this,clone(this.marks[t].mark[i]),this.marks[t].encode.hover) : clone(this.marks[t].mark[i]));
						// Set the canvas colours
						this.setCanvasStyles(ctx,mark);
						this.setCanvasStyles(this.paper.temp.ctx,mark);
					}

					// Draw the marks
					if(typ=="line") this.drawLine(t,{'ctx':ctx});
					if(typ=="symbol") this.drawShape(mark,{'ctx':ctx});
					if(typ=="rect") this.drawRect(mark,{'ctx':ctx});
					if(typ=="area") this.drawArea(t,{'ctx':ctx});
					if(typ=="rule") this.drawRule(t,{'ctx':ctx});
					if(typ=="text") this.drawText(mark,{'ctx':ctx});

					// Put the styles back to what they were
					if(typ=="line" || typ=="symbol" || typ=="rect" || typ=="area" || typ=="rule" || typ=="text"){
						this.setCanvasStyles(ctx,this.marks[t].mark[i]);
						this.setCanvasStyles(this.paper.temp.ctx,this.marks[t].mark[i]);
					}

					// Set the clipping
					if(clipping) ctx.restore();
					if(parseFloat(w) >= top && mark.props.tooltip){
						top = parseFloat(w);
						topmark = mark;
						series = this.marks[t];
					}
				}
			}

			var cls = 'graph-tooltip aas-series-'+t+' '+(this.options.tooltip && this.options.tooltip.theme ? this.options.tooltip.theme : "");
			if(!this.coordinates){
				this.canvas.canvasholder.append('<div class="'+cls+'" style="position:absolute;display:none;"></div>');
				this.coordinates = this.canvas.container.find('.graph-tooltip');
				this.coordinates.on('mousemove',function(){ disableScroll(); });
			}
			var html = "";

			if(topmark){
				// Update tooltip styles
				/*
				this.coordinates.attr('css','');

				// Clear any extra rules we added to the tooltip arrow
				var tta = ".graph-tooltip:after";
				if(!this.style){
					// Create a new stylesheet
					this.style = document.createElement("style");
					// WebKit hack
					this.style.appendChild(document.createTextNode(""));
					// Add the <style> element to the page
					document.head.appendChild(this.style);
				}else{
					this.style.sheet.deleteRule(tta);
				}
				if(typeof series.css=="object"){
					// Set the styles
					this.coordinates.css(series.css);

					// Add a rule for the tooltip arrow
					if(series.css['background-color']) this.style.sheet.insertRule(tta+" { border-color: "+series.css['background-color']+"!important; }");
				}*/
	
				// Build the hovertext output
				val = {
					title: (series.title) ? series.title : "", 
					xlabel: (this.x.label.text ? this.x.label.text : (this.x.isDate ? 'Time' : 'x')),
					ylabel: (this.y.label.text ? this.y.label.text : 'y'),
					data: series.data[i]
				};
			
				html = removeRoundingErrors(topmark.props.tooltip) || "";
			}
			if(html){
				var x,y,c;
				this.coordinates.html(html);
				x = topmark.props.x + this.canvas.c.offsetLeft;
				y = topmark.props.y;
				this.coordinates.css({'display':'block','left':Math.round(x)+'px','top':Math.round(y)+'px'});
				c = (y < this.chart.height/3 ? 'n' : (y > this.chart.height*2/3 ? 's':''));
				c += (x < this.chart.width/3 ? 'w' : (x > this.chart.width*2/3 ? 'e' : ''));
				if(!c) c = 'w';
				this.coordinates.attr('class',cls+' graph-tooltip-'+c);
				this.annotated = true;
			}else{
				this.coordinates.css({'display':'none'});
			}
		}else{
			if(this.annotated){
				this.annotated = false;
				this.coordinates.css({'display':'none'});
				this.canvas.pasteFromClipboard();
			}
		}
		return this;
	};

	/**
	 * @desc Set the increment size for this axis
	 * @param {string} a - the axis e.g. "x" or "y"
	 * @param {number} inc - the axis tick mark increment
	 */
	Graph.prototype.setInc = function(a,inc){
		if(typeof inc=="number"){
			//this[a].inc = inc;
			this[a].ticks.inc = Num(inc);
		}else{
			if(inc.type!="Num") inc = Num(inc);
			this[a].ticks.inc = inc;
			//this[a].inc = inc.toValue();
		}
		return this;
	};

	/**
	 * @desc Defines max, min, inc, range, logmax, logmin, logrange, ticks, ticks.min, ticks.max, ticks.range, ticks.inc, spacing, precision
	 * @param {string} a - the axis e.g. "x" or "y"
	 * @param {number} min - the minimum value for the axis
	 * @param {number} max - the maximum value for the axis
	 */
	Graph.prototype.defineAxis = function(a,min,max){

		// Immediately return if the input seems wrong
		if(typeof a != "string" || (a != "x" && a != "y")) return this;

		var t_inc,steps,t_div,t_max,t_min,st,sp,n,i,rg,mx,mn;

		// Set the min/max if provided
		if(typeof max=="number" && typeof min=="number"){
			this[a].max = max;
			this[a].min = min;
		}else{
			this[a].max = this[a].data.max;
			this[a].min = this[a].data.min;
			this.addAxisPadding(a,(this.options[a+'axis'].padding||0));
		}

		// Sort out what to do for log scales
		if(this[a].log){
			// Adjust the low and high values for log scale
			this[a].logmax = G.log10(this[a].max);
			this[a].logmin = (this[a].min <= 0) ? this[a].logmax-2 : G.log10(this[a].min);
			this[a].logrange = this[a].logmax-this[a].logmin;
		}

		// Set the range of the data
		this[a].range = Num(this[a].max).minus(this[a].min).toValue();
		// We'll create an object that behaves a bit like an array but contains other properties
		if(!this[a].ticks){
			this[a].ticks = {};
		}else{
			// Delete any existing ticks
			for(i = 0; i < this[a].ticks.length; i++) delete this[a].ticks[i];
			this[a].ticks.length = 0;
		}
		if(!this[a].ticks.props) this[a].ticks.props = {};

		// Sort out what to do for log scales
		if(this[a].log){
			this[a].ticks.min = this[a].logmin+0;
			this[a].ticks.max = this[a].logmax+0;
			this.setInc(a,1);
			this[a].range = this[a].max-this[a].min;
			this[a].ticks.range = this[a].logrange+0;
			this.makeTicks(a);
			return this;
		}
		// If we have zero range we need to expand it
		if(this[a].range < 0){
			this.setInc(a,0.0);
			this[a].ticks.range = 0.0;
			return this;
		}else if(this[a].range == 0){
			this[a].ticks.min = Math.ceil(this[a].max)-1;
			this[a].ticks.max = Math.ceil(this[a].max);
			this[a].min = this[a].ticks.min;
			this[a].max = this[a].ticks.max;
			this.setInc(a,1.0);
			this[a].range = this[a].max-this[a].min;
			this[a].ticks.range = this[a].ticks.max-this[a].ticks.min;
			this.makeTicks(a);
			return this;
		}

		rg = this[a].range;
		mx = this[a].max;
		mn = this[a].min;
		
		// Set the label scaling
		var scale = (a=="x" && this[a].ticks.props.scale) ? this[a].ticks.props.scale : 1;


		// Calculate reasonable grid line spacings
		// Dates are in seconds
		// Grid line spacings can range from 1 ms to 10000 years
		// Use Gregorian year length for calendar display
		// 31557600000
		steps = [{'name': 'nanoseconds', 'div': 1e-9, 'spacings':[1,2,5,10,20,50,100,200,500]},
				{'name': 'microseconds', 'div': 1e-6, 'spacings':[1,2,5,10,20,50,100,200,500]},
				{'name': 'milliseconds', 'div': 1e-3, 'spacings':[1,2,5,10,20,50,100,200,500]},
				{'name': 'seconds','div':1,'spacings':[1,2,5,10,15,20,30]},
				{'name': 'minutes', 'div':60,'spacings':[1,2,5,10,15,20,30]},
				{'name': 'hours', 'div':3600,'spacings':[1,2,4,6,12]},
				{'name': 'days', 'div':86400,'spacings':[1,2]},
				{'name': 'weeks', 'div':7*86400,'spacings':[1,2]},
				{'name': 'months', 'div': 30*86400, 'spacings':[1,3,6]},
				{'name': 'years', 'div':365.2425*86400,'spacings':[1,2,5,10,20,50,100,200,500,1000,2000,5e3,1e4,2e4,5e4,1e5,2e5,5e5,1e6]}];
		steps = (this[a].ticks.props.steps || steps);
		t_div = 1e100;

		for(st = 0; st < steps.length ; st++){
			for(sp = 0; sp < steps[st].spacings.length; sp++){
				n = Math.ceil(Num(this[a].range).times(scale).div(Num(steps[st].div).times(steps[st].spacings[sp])).toValue());
				if(n < 1 || n > 20) continue;
				else{
					if(n >= 3 && n < t_div){
						t_div = n;
						this[a].spacing = {
							'name':steps[st].name,
							'fract':steps[st].spacings[sp],
							'scale':scale,
							'div':steps[st].div
						};
						//console.log('n',n,this[a].spacing,this[a].range,scale,steps[st].div,steps[st].spacings[sp])
					}
				}
			}
		}

		// If we have a function that converts the number, we now convert the min and max
		// to the current format from the input format (this[a].units)
		if(typeof this[a].ticks.props.convert==="function"){

			mn = this[a].ticks.props.convert.call(this,this[a].min,this[a].units);
			mx = this[a].ticks.props.convert.call(this,this[a].max,this[a].units);
			this[a].spacing = {'div':defaultSpacing(mn,mx,(this[a].isDate ? 3 : 5)),'fract':1};
			// See if we have a custom spacing function
			if(typeof this[a].ticks.props.spacing==="function"){
				sp = this[a].ticks.props.spacing.call(this,mx-mn);
				if(sp > 0) this[a].spacing.div = sp;
			}
		}
		
		// If the output format is a "date" type and the input scale is set to 1 we use base 60/24 as appropriate
		if(this[a].isDate && scale==1){

			// The displayed labels are shown as dates (this uses date rounding)
			this[a].showAsDate = true;

			// Set the min and max values by rounding the dates
			t_inc = Num(this[a].spacing.div).times(this[a].spacing.fract);
			t_min = (roundDate(mn,{'range':this[a].range,'unit':this[a].spacing.name,'inc':t_inc,'n':this[a].spacing.fract,'method':'floor'}));
			t_max = (roundDate(mx,{'range':this[a].range,'unit':this[a].spacing.name,'inc':t_inc,'n':this[a].spacing.fract,'method':'ceil'}));

		}else if(this[a].isPhase){
		
			this[a].showAsDate = false;

			t_inc = Num(this[a].spacing.div).times(this[a].spacing.fract);
			t_min = Math.floor(mn/t_inc.toValue())*t_inc.toValue();
			t_max = Math.ceil(mx/t_inc.toValue())*t_inc.toValue();

		}else{

			// Do we do date-based rounding
			this[a].showAsDate = false;
	
			// Scale the range before we work out the spacings

			t_inc = defaultSpacing(Num(mn).div(scale).toValue(),Num(mx).div(scale).toValue(),(this[a].isDate ? 3 : 5));
			t_inc = Num(t_inc).times(scale).toValue();

			// Round to nearest t_inc (because of precision issues)
			t_min = Num(mn).div(t_inc).round(0,mn < 0 ? 3:0).times(t_inc).toValue();
			t_max = Num(mx).div(t_inc).round(0,mx < 0 ? 0:3).times(t_inc).toValue();

			// Determine the number of decimal places to show
			// Quicker to do it here than in makeTicks.
			this[a].precisionlabel = Math.ceil(Math.abs(Math.log10(t_inc)));
			if(this[a].precisionlabel==0 && Math.abs(t_min) > 10) this[a].precisionlabel = Math.floor(Math.log10(Math.abs(t_min)));

			// If we are dealing with dates we set the precision that way
			if(this[a].isDate){
				var p = Math.log10(t_inc);
				this[a].precisionlabeldp = (p < 0) ? Math.ceil(Math.abs(Math.log10(t_inc))) : 0;
				this[a].precisionlabel = Math.ceil(Math.abs(Math.log10(t_max)-Math.log10(t_inc)));
			}
			t_inc = Num(t_inc);

		}

		// Set the first/last gridline values as well as the spacing
		this[a].ticks.min = t_min;
		this[a].ticks.max = t_max;
		this.setInc(a,t_inc);
		this[a].ticks.range = this[a].ticks.max-this[a].ticks.min;
		this[a].precision = this[a].precisionlabel+Math.floor(Math.log10(Math.abs(scale)));

		this.makeTicks(a);

		return this;
	};

	/**
	 * @desc Define the output format for an axis
	 * @param {string} a - the axis e.g. "x" or "y"
	 * @param {string} type - the axis output units e.g. "unity", "jd", "radians", "relative"
	 * @param {object} types - the formats object that defines the types
	 */
	Graph.prototype.setAxisFormat = function(a,type,types){
		this[a].formats = types;
		// Update the tick properties
		this[a].ticks.props = types[type];
		// Update the tick label units
		this[a].ticks.units = type;
		if(types[type].types){
			this[a].isDate = (types[type].types.absolute ? true : false);
			this[a].isPhase = (types[type].types.phase ? true : false);
		}else{
			this[a].isDate = false;
			this[a].isPhase = false;
		}
		return this;
	};

	/**
	 * @desc Make the tick marks. Sets this[a].ticks.min, this[a].ticks.max, this[a].ticks.range, and this[a].ticks[i]
	 * @param {string} a - the axis e.g. "x" or "y"
	 */
	Graph.prototype.makeTicks = function(a){
		var v,mn,mx,l,sci,precision,fmt,i,d,vmx,calcval;
		this.log.time('makeTicks');
		// Get the min/max tick marks
		mn = this[a].ticks.min;
		mx = this[a].ticks.max;
	
		if(this[a].log){
			mn = Math.floor(mn);
			mx = Math.ceil(mx);
		}

		if(isNaN(mn) || isNaN(mx)) return this;

		mn = Num(mn);
		mx = Num(mx);


		this[a].ticks.length = 0;
		vmx = mx.plus(this[a].ticks.inc.times(0.2)).toValue();
		for(v = mn, i = 0; v.toValue() <= vmx; v = v.plus(this[a].ticks.inc), i++){
			if(this[a].showAsDate) this[a].ticks[i] = {'value':roundDate(v,{'range':this[a].range,'unit':this[a].spacing.name,'n':this[a].spacing.fract,'inc':this[a].ticks.inc}),'label':''};
			else this[a].ticks[i] = {'value':v,'label':''};
			this[a].ticks.length++;
		}


		if(this[a].ticks.length == 0){
			this.log.warning('No ticks');
			return this;
		}
		mn = this[a].ticks[0].value;
		mx = this[a].ticks[this[a].ticks.length-1].value;
	
		// A function to format the date nicely
		function niceDate(d,sp){
			var hr,mn,sc,dy,mo,yr,n,f,fs,str,idx,bits;
			fs = "";
			str = (typeof d==="number" ? Num(d):d).toString();
			idx = str.indexOf(".");
			bits = [Num(str),Num(0)];
			if(idx >= 0){
				fs = "."+str.substr(idx+1,str.length-1);
				bits = [Num(str.substr(0,idx)),Num("0"+fs)];
			}
			d = new Date(bits[0].times(1000).toValue());
			if(!sp) sp = {'fract':1,'name':'seconds'};
			f = sp.fract;
			hr = zeroFill(d.getUTCHours(),2);
			mn = zeroFill(d.getUTCMinutes(),2);
			sc = removeRoundingErrors(zeroFill(d.getUTCSeconds()+d.getUTCMilliseconds()/1000,2));
			dy = zeroFill(d.getUTCDate(),2);
			mo = zeroFill(d.getUTCMonth()+1,2);
			yr = d.getUTCFullYear();
			n = sp.name;
			if(n=="nanoseconds" || n=="microseconds" || n=="milliseconds") return sc+""+fs;
			else if(n=="seconds") return (f >= 1 ? hr+":"+mn+":"+sc : ""+sc+""+fs);
			else if(n=="minutes") return hr+":"+mn+(d.getUTCSeconds()==0 ? "" : ":"+sc);
			else if(n=="hours") return hr+":"+mn;
			else if(n=="days") return (f >= 1 ? yr+"-"+mo+"-"+dy : yr+"-"+mo+"-"+dy+' '+hr+':'+mn);
			else if(n=="weeks") return yr+"-"+mo+"-"+dy;//+(hr=="00" ? '' : ' '+Math.round((d.getUTCHours()+(d.getUTCMinutes()/60)))+'h');
			else if(n=="months") return yr+"-"+mo;
			else if(n=="years") return (f >= 1 ? ''+(d.getUTCFullYear()+Math.round((d.getUTCMonth()+1)/12)) : (Math.round(d.getUTCMonth()+1)==12 ? (d.getUTCFullYear()+1)+"-01-01" : d.getUTCFullYear()+'-'+mo+'-01'));
			else return hr+':'+mn+':'+sc;
		}

		// Calculate the number of decimal places for the increment
		this.sci_hi = 10000;
		this.sci_lo = 1e-4;

		l = Math.max(Math.abs(mx),Math.abs(mn));
		sci = (l > this.sci_hi || l < this.sci_lo);
		// Check if the data range is within our scientific bounds
		if(mx-mn < this.sci_hi && mx-mn > this.sci_lo) sci = false;
		// Get the number of decimal places to show
		precision = this[a].precision;
		var _obj = this;
		function shortestFormat(fmt){
			var l = 1e100;
			var i = "";
			for(var f in fmt){
				if(fmt[f]){
					try { fmt[f] = fmt[f].replace(/\.0+((e[\+\-0-9]+)?)$/,function(m,p1){ return p1; }).replace(/^([^\.]+[\.][^1-9]*)0+$/,function(m,p1){return p1;}).toLocaleString(); }
					catch(err){ _obj.log.error(fmt[f],err); }
					if(typeof fmt[f]!=="string" || fmt[f] == "NaN") fmt[f] = "";
					if(fmt[f].length < l){
						l = fmt[f].length;
						i = f;
					}
				}
			}
			return fmt[i];
		}
	
		if(this[a].log){
			// Format labels for log scale
			for(i = 0; i < this[a].ticks.length; i++){
				v = Math.pow(10,this[a].ticks[i].value.toValue());
				sci = (Math.abs(v) > this.sci_hi || Math.abs(v) < this.sci_lo);
				fmt = {};
				if(sci){
					precision = (""+v).length;
					fmt.normal = ""+v;
					fmt.exp = tidy(v.toExponential(precision));
				}else{
					precision = Math.abs(this[a].ticks[i].value);
					if(this[a].ticks.inc.toValue() > 1) fmt.round = ""+Math.round(v);
					else fmt.fixed = (Math.abs(v/this[a].range) < 1e-12) ? "0" : v.toFixed(precision);
				}

				// Set the label to whichever is shortest
				this[a].ticks[i].label = shortestFormat(fmt);
			}
		}else{

			// Format labels for linear scale
			for(i = 0; i < this[a].ticks.length; i++){
				v = this[a].ticks[i].value;
				if(this[a].showAsDate){
					// Default date formatting
					d = (this[a].spacing && this[a].spacing.name=="seconds" && this[a].spacing.fract < 1e-3) ? v.toValue().toFixed(precision+3) : niceDate(v,this[a].spacing);
					this[a].ticks[i].label = d;
				}else{
					fmt = {};
					precision = this[a].precision;
					// Find the differential precision
					if(v.gt(this.sci_hi) || v.lt(this.sci_lo)) precision = Math.floor(Math.log10(v.abs().toValue())) - Math.floor(Math.log10(Math.abs(this[a].ticks.inc.toValue())));
					if(this[a].isDate) precision = 1;
					if(precision < 1) precision = this[a].precisionlabel;
					if(sci){
						if(this[a].isDate) fmt.date = ""+v;
						else fmt.exp = v.toValue().toExponential(precision);
					}else{
						if(this[a].ticks.inc.toValue() > 1) fmt.round = ""+v.round(0,1).toString();
						else fmt.fixed = v.toString();
					}

					// Bug fix for Javascript rounding issues when the range is big
					if(Math.abs(v/this[a].range) < 1e-12) fmt.fixed = "0";

					// Set the label to whichever is shortest
					this[a].ticks[i].label = shortestFormat(fmt);
				}
			}
		}
		if(!this[a].showAsDate){
			for(i = 0; i < this[a].ticks.length; i++){
				// Because of precision issues, use the label to rebuild the value
				calcval = this[a].ticks[i].value.toValue();
				this[a].ticks[i].value = (typeof calcval==="number") ? calcval : parseFloat(this[a].ticks[i].label);
			}
		}

		// If formatLabel is set we use that to format the label
		if(this[a].ticks.props && typeof this[a].ticks.props.formatLabel==="function"){
			for(i = 0; i < this[a].ticks.length; i++){
				var str = '';
				var o = this[a].ticks.props.formatLabel.call(this,this[a].ticks[i].value,{'i':i,'axis':a,'dp':this[a].precisionlabeldp,'ticks':this[a].ticks,'input':(this[a].units||""),'output':(this[a].ticks.units||""),'niceDate':niceDate,'spacing':this[a].spacing});
				if(o) str = tidy(o.truncated || o.str);
				this[a].ticks[i].label = str;
			}
		}

		// Final tidy
		for(i = 0; i < this[a].ticks.length; i++) this[a].ticks[i].label = tidy(this[a].ticks[i].label);
		// Fix precision issues
		if(this[a].log){
			// Update all the values for the log scale
			for(i = 0; i < this[a].ticks.length; i++) this[a].ticks[i].value = Math.pow(10,this[a].ticks[i].value);
			this[a].ticks.min = G.log10(this[a].ticks[0].value);
			this[a].ticks.max = G.log10(this[a].ticks[this[a].ticks.length-1].value);
		}else{
			this[a].ticks.min = this[a].ticks[0].value;
			this[a].ticks.max = this[a].ticks[this[a].ticks.length-1].value;
		}
		
		// We want to convert the values back to the input format so that
		// they appear in the correct place on the graph
		for(i = 0; i < this[a].ticks.length; i++){
			if(this[a].units && typeof this[a].formats[this[a].units].convert==="function"){
				this[a].ticks[i].value = Num(this[a].formats[this[a].units].convert.call(this,this[a].ticks[i].value,this[a].ticks.units));
			}
		}

		this[a].ticks.range = this[a].ticks.max - this[a].ticks.min;
		this.log.time('makeTicks');

		return this;
	};

	/**
	 * @desc A factor to scale the overall font size then redraw the graph
	 */
	Graph.prototype.scaleFont = function(s){
		if(s == 0) this.fontscale = 1;
		else this.fontscale *= (s>0 ? 1.1 : 1/1.1);
		this.setChartOffset().resetDataStyles().redraw({'update':true});
		return this;
	};

	/**
	 * @desc Get the font height for an axis and type
	 * @param {string} a - the axis e.g. "x" or "y"
	 * @param {string} t - the chart element to style e.g. "title" or "label"
	 */
	Graph.prototype.getFontHeight = function(a,t){
		var fs = this.chart.fontsize;
		if(this.options[a+'axis'] && this.options[a+'axis'][t+'FontSize']) fs = this.options[a+'axis'][t+'FontSize'];
		return fs*this.fontscale;
	};

	/**
	 * @desc Set the chart offsets such as left, right, top, bottom, width, height, padding, fontsize, and fontfamily
	 */
	Graph.prototype.setChartOffset = function(){
		if(typeof this.chart!="object") this.chart = {};
		var fs,ff,o,c,a,ax,offx,dp,b;
		fs = getStyle(this.canvas.container[0], 'font-size');
		ff = getStyle(this.canvas.container[0], 'font-family');
		o = this.options;
		c = this.chart;
		if(!c.left) c.left = 0;
		// Set the target
	
		c.padding = (this.canvas.fullscreen) ? 36 : 0;
		c.fontsize = (typeof fs=="string") ? parseInt(fs) : 12;
		c.fontfamily = (typeof ff=="string") ? ff : "";

		// Correct for sub-pixel positioning
		b = o.grid.border*0.5;
		c.padding = o.padding || c.padding;
		c.top = c.padding + b;
		c.left = clone(c.top);
		c.bottom = clone(c.top);
		c.right = clone(c.top);
		offx = clone(c.top);
		ax = {'xaxis':'bottom','yaxis':'left'};
		for(a in ax){
			if(o[a]){
				if(o[a].title){
					dp = this.getFontHeight(a.substr(0,1),'title')*1.5;
					this.chart[ax[a]] += dp;
					if(a=="xaxis") offx += dp;
				}
				if(typeof o[a].labels==="undefined") o[a].labels = true;
				if(o[a].labels){
					c[ax[a]] += (a=="xaxis" ? this.getFontHeight('x','label')*1.2 : this.getLabelWidth());
					offx += 4;
				}
				if(o[a].ticks){
					dp = (o[a].tickSize||4) + 3;
					c[ax[a]] += dp;
					if(a=="xaxis") offx += dp;
				}
				c[ax[a]] = Math.round(c[ax[a]]);
			}
		}
		c.width = this.canvas.wide-c.right-c.left;
		c.height = this.canvas.tall-c.bottom-c.top;

		this.chart = c;
		return this;
	};

	/**
	 * @desc Get the maximum width of y-axis labels in pixels.
	 */
	Graph.prototype.getLabelWidth = function(){
		// If we aren't showing labels the width is 0
		var ok = (typeof this.options.yaxis.labels==="boolean") ? this.options.yaxis.labels : (this.options.labels && this.options.labels.show ? this.options.labels.show : false);
		if(!ok) return 0;

		var fs,mn,mx,ctx,i,maxw,maxdp,maxi,maxe,s;

		// Set font for labels
		fs = this.getFontHeight('y','label');
		maxw = 0;
		maxdp = 0;
		maxi = 0;
		maxe = 0;
		ctx = this.canvas.ctx;
		ctx.font = fs+'px '+this.chart.fontfamily;

		mn = this.y.ticks.min;
		mx = this.y.ticks.max;

		if(this.y.log){
			mn = Math.ceil(this.y.ticks.min);
			mx = Math.floor(this.y.ticks.max);
		}

		if(this.y.ticks){
			// Chop down the labels so that the length doesn't oscillate when we're adding decimal places
			// Loop over and find the length of the decimal portion and length of the integer portion 
			for(i = 0; i < this.y.ticks.length; i++){
				if(this.y.ticks[i].label.indexOf(".") > 0) maxdp = Math.max(maxdp,this.y.ticks[i].label.replace(/^.*\.([0-9]+).*$/,function(m,p1){ return p1; }).length);
				if(this.y.ticks[i].label != "0") maxi = Math.max(maxi,this.y.ticks[i].label.replace(/^[\-\+]?([0-9]+).*$/,function(m,p1){ return p1; }).length);
				if(this.y.ticks[i].label.indexOf("e") > 0) maxe = Math.max(maxi,this.y.ticks[i].label.replace(/.*e([\-\+0-9]+)$/,function(m,p1){ return p1; }).length);
			}
			if(maxe > 0){
				// Calculate the length of the exponential labels
				if(maxdp == 0) maxdp = 1;
				maxw = ctx.measureText("1."+(maxdp > 0 ? Array(Math.ceil(maxdp/3)*3).join('1')+'1' : '')+"e+"+Math.floor(Math.log10(this.y.range))).width;
			}else{
				// Build a dummy label using the lengths we found
				var label = '';
				label += Array(Math.ceil((maxi+maxdp)/3)*3).join('1')+'1';
				if(maxdp > 0) label += '.';
				maxw = Math.max(maxw,ctx.measureText(label).width);
			}
		}
		s = Math.round(fs*1.5);
		return Math.max(s*2,Math.round(Math.ceil(maxw/s)*s)) + 4;
	};

	/**
	 * @desc Draw the axes and grid lines for the graph
	 */
	Graph.prototype.drawAxes = function(){
		var tw,lw,c,ctx,rot,axes,r,i,j,k,a,o,d,s,p,mn,mx,fs,y1,y2,x1,x2,prec,fshalf,di;
		c = this.chart;
		ctx = this.canvas.ctx;
		rot = Math.PI/2;
		axes = {'xaxis':{},'yaxis':{}};
		r = {
			'xmin': this.chart.left,
			'xmax': this.chart.left+this.chart.width,
			'ymax': this.chart.top+this.chart.height,
			'ymin': this.chart.top
		};
		var orient = {
			'left': {'rot':rot,'x1': r.xmin,'x2': r.xmax,'textAlign': 'end','textBaseline': 'middle'},
			'right': {'rot':-rot,'x1': r.xmin,'x2': r.xmax,'textBaseline': 'middle'},
			'bottom': {'textBaseline': 'top','y1': r.ymax,'y2': r.ymin}
		};

		if(!this.subgrid) this.subgrid = [2,3,4,5,6,7,8,9];

		if(typeof this.background==="string"){
			ctx.beginPath();
			ctx.fillStyle = (this.background||"transparent");
			ctx.rect(0,0,this.canvas.wide,this.canvas.tall);
			ctx.fill();
			ctx.closePath();
		}

		ctx.beginPath();
		ctx.font = this.chart.fontsize+'px '+this.chart.fontfamily;
		ctx.textBaseline = 'middle';

		// Draw main rectangle
		if(this.options.grid.border > 0){
			ctx.strokeStyle = (this.options.grid.color || 'rgb(0,0,0)');
			ctx.lineWidth = this.options.grid.border;
			ctx.setLineDash([1,0]);
		}

		if(typeof this.options.grid.background=="string"){
			ctx.fillStyle = this.options.grid.background;
			ctx.fillRect(c.left,c.top,c.width,c.height);
		}
		ctx.closePath();
	
		for(a in axes){
			if(axes[a]){

				o = this.options[a].orient || "left";
				// Set axis direction
				d = "x";
				if(o=="left" || o=="right") d = "y";
				if(!this[d]) continue;

				// What do we show?
				var show = {'grid':false,'labels':true,'ticks':true,'domain':true};
				for(s in show){
					if(typeof show[s]!="undefined"){
						if(typeof this.options[a][s]==="boolean") show[s] = this.options[a][s];
						if(this.options[s] && this.options[s].show) show[s] = this.options[s].show;
					}
				}
		
				// Set the tick width
				tw = 0;
				if(show.ticks) tw = (this.options[a].tickSize||4);

				// Draw axis line
				if(show.domain){
					ctx.beginPath();
					ctx.strokeStyle = (this.options[a].domainColor || this.options.grid.color || 'rgb(0,0,0)');
					ctx.lineWidth = (this.options[a].domainWidth || this.options.grid.border);
					lw = 0.5;
					if(o=="left"){
						ctx.moveTo(c.left+lw,c.top);
						ctx.lineTo(c.left+lw,c.top+c.height);
					}else if(o=="bottom"){
						ctx.moveTo(c.left,c.top+c.height+lw);
						ctx.lineTo(c.left+c.width,c.top+c.height+lw);
					}
					ctx.stroke();
					ctx.closePath();
				}

				ctx.lineWidth = 1;

				// Draw label
				if(this.options[a].title!=""){
					p = [0,0];
					ctx.beginPath();
					ctx.textAlign = "center";
					ctx.textBaseline = "bottom";
					fs = this.getFontHeight(d,'title');
					ctx.font = (this.options[a].titleFontWeight || "bold")+' '+fs+'px '+(this.options[a].titleFont || this.chart.fontfamily);
					ctx.fillStyle = (this.options[a].titleColor || this.options.labels.color);

					// Work out coordinates
					if(o=="bottom") p = [c.left+c.width/2,this.options.height-Math.round(fs/2)-this.chart.padding];
					else if(o=="left") p = [-(c.top+(c.height/2)),Math.round(fs/2)+this.chart.padding];

					if(orient[o] && orient[o].rot) ctx.rotate(-orient[o].rot);
					this.drawTextLabel(this.options[a].title, p[0], p[1]+fs/2, {ctx:ctx, axis:d, format: { fontSize:fs, fontWeight:(this.options[a].titleFontWeight || "bold"), 'font':(this.options[a].titleFont || this.chart.fontfamily), 'baseline':'bottom'}});
					if(orient[o] && orient[o].rot) ctx.rotate(orient[o].rot);
					ctx.closePath();
				}

				// Draw axis grid and labels
				ctx.textAlign = orient[o].textAlign || 'end';
				ctx.textBaseline = orient[o].textBaseline || 'top';

				// Set font for labels
				fs = this.getFontHeight(d,'label');
				ctx.font = fs+'px '+this.chart.fontfamily;
				ctx.lineWidth = (this.options.grid.width ? this.options.grid.width : 0.5);

				// Get axis properties
				var axis = this[d];

				if(d=="x"){
					y1 = orient[o].y1;
					y2 = orient[o].y2;
				}
				if(d=="y"){
					x1 = orient[o].x1;
					x2 = orient[o].x2;
				}
				// Calculate the number of decimal places for the increment - helps with rounding errors
				if(this[d].precision){
					prec = this[d].precision;
				}else{
					prec = ""+axis.ticks.inc.toValue();
					prec = prec.length-prec.indexOf('.')-1;
				}
				fshalf = Math.ceil(fs/2);
				var oldx = 0;
				var str,v;
		
				mn = axis.ticks.min;
				mx = axis.ticks.max;
				if(axis.log){
					mn = Math.floor(axis.ticks.min);
					mx = Math.ceil(axis.ticks.max);
				}

				for(var ii = 0; ii < axis.ticks.length; ii++) {
					i = axis.ticks[ii].value;
					// Investigate here console.log(d,axis.ticks[ii],this.getPos(d,i))
					p = this.getPos(d,i);
					if(!p || !isFinite(p)) continue;
					// As <canvas> uses sub-pixel positioning we want to shift the placement 0.5 pixels
					p = (p-Math.round(p) > 0) ? Math.floor(p)+0.5 : Math.ceil(p)-0.5;
					if(d=="y"){
						y1 = p;
						y2 = p;
					}else if(d=="x"){
						x1 = p;
						x2 = p;
					}
					v = (typeof i==="object") ? i.toValue() : i;
					j = (axis.log) ? G.log10(v) : parseFloat(v.toFixed(prec));

					if(p >= r[d+'min'] && p < r[d+'max']){
						ctx.beginPath();
						ctx.strokeStyle = (this.options[a].gridColor || 'rgba(0,0,0,0.5)');
						ctx.fillStyle = (this.options[a].labelColor || this.options.labels.color);

						// Draw tick labels
						if(show.labels){
							if(d=="x"){
								str = axis.ticks[ii].label;
								if(!str) str = "";
								var ds = str.split(/\n/);
								var maxw = 0;
								for(k = 0; k < ds.length ; k++) maxw = Math.max(maxw,ctx.measureText(ds[k]).width);
								if(x1+maxw/2 <= c.left+c.width && x1 > oldx && x1-maxw/2 > 0){
									ctx.textAlign = 'center';
									ctx.fillStyle = this.options.labels.color;
									for(k = 0; k < ds.length ; k++){
										this.drawTextLabel(ds[k], x1,(y1 + 3 + tw + k*fs), {ctx:ctx, axis:d, format: { fontSize:fs, fontWeight:'normal', 'font':fs+'px '+this.chart.fontfamily, 'align':'center','baseline':(orient[o].textBaseline || 'top')}});
									}
									oldx = x1 + (j == axis.ticks.min ? maxw : maxw) + 4;	// Add on the label width with a tiny bit of padding
								}
							}else if(d=="y"){
								ctx.textAlign = 'end';
								if(j==this.y.ticks.max) ctx.textBaseline = 'top';
								str = axis.ticks[ii].label;
								ctx.fillText(str,(x1 - 3 - tw),(y1).toFixed(1));
							}
						}

						ctx.stroke();
							
						// Draw grid lines
						ctx.strokeStyle = (this.options[a].gridColor || 'rgba(0,0,0,0.5)');
						if(show.grid && j >= axis.ticks.min && j <= axis.ticks.max){
							ctx.beginPath();
							ctx.lineWidth = (this.options[a].gridWidth || 0.5);
							ctx.moveTo(x1,y1);
							ctx.lineTo(x2,y2);
							ctx.stroke();
						}
			
						// Draw tick marks lines
						ctx.strokeStyle = (this.options[a].tickColor || 'rgba(0,0,0,0.5)');
						if(show.ticks && i > axis.min && i < axis.max){
							ctx.beginPath();
							ctx.lineWidth = (this.options[a].tickWidth || 0.5);
							ctx.strokeStyle = (this.options[a].tickColor || 'rgba(0,0,0,0.5)');
							if(d=="x"){
								ctx.moveTo(x1,y1);
								ctx.lineTo(x2,y1+tw);
							}else if(d=="y"){
								ctx.moveTo(x1,y1);
								ctx.lineTo(x1-tw,y2);				
							}
							ctx.stroke();
							ctx.closePath();
						}
					}

					// Draw sub grid for log scale
					if(axis.log && show.grid){
						ctx.beginPath();
						ctx.strokeStyle = (this.options[a].tickColor || 'rgba(0,0,0,0.2)');
						ctx.lineWidth = (this.options[a].tickWidth || 0.5);
						for(j = 0; j < this.subgrid.length ; j++){
							di = i*this.subgrid[j];
							if(di < axis.max && di > axis.min){
								p = this.getPos(d,di);
								p = (p-Math.round(p) > 0) ? Math.floor(p)+0.5 : Math.ceil(p)-0.5;
								if(p >= r[d+'min'] && p < r[d+'max']){
									if(d=="x"){
										ctx.moveTo(p,y1);
										ctx.lineTo(p,y1+tw);
									}else if(d=="y"){
										ctx.moveTo(x1,p);
										ctx.lineTo(x1-tw,p);
									}
								}
							}
						}
						ctx.stroke();
						ctx.closePath();
					}
				}
			}
		}
		return this;
	};


	/**
	 * @desc Reset all the styles for the datasets
	 */
	Graph.prototype.resetDataStyles = function(){
		var sh,i;
		for(sh in this.marks){
			if(this.marks[sh].update && this.marks[sh].show){
				for(i = 0; i < this.marks[sh].mark.length ; i++){
					// Process all the series updates here
					this.marks[sh].mark[i] = this.marks[sh].update.call(this,this.marks[sh].mark[i],this.marks[sh].encode.update);
				}
			}
		}
		return this;
	};

	/**
	 * @desc Replacement function to combine calculateData() and draw() but allow interrupt
	 * @param {object} attr - attributes
	 * @param {boolean} attr.update - do we update things as we go?
	 * @param {boolean} attr.cancelable - can we cancel this redraw part-way through?
	 */
	Graph.prototype.redraw = function(attr){
		this.log.message('redraw');
		this.log.time('redraw');

		if(!attr) attr = {};
		if(typeof attr.update!=="boolean") attr.update = true;
		if(typeof attr.cancelable!=="boolean") attr.cancelable = true;

		var sh,chunk,series;

		// The calculation can lock up the process if there are a lot of points.
		// In order to be able to interrupt/cancel the calculation we need to 
		// put it into a setTimeout loop.
		chunk = 10000;	// Number of points to process at a time
		// Build a temporary array to store how many points we've processed for each series
		series = [];
		for(sh in this.marks){
			if(this.marks[sh] && this.marks[sh].show) series.push({'id':sh,'done':0});
		}

		// Function to process all the series chunk-by-chunk
		function processChunk(self,s,attr){
			var sh,d,i,j,v,a,a1,a2,axes,axis;
			axes = ['x','y'];
			j = 0;
			while(j < chunk && s < series.length){
				sh = series[s].id;

				// If we haven't yet finished this series
				for(i = series[s].done; i < self.marks[sh].mark.length && j < chunk ; i++, j++){
					d = self.marks[sh].mark[i];

					// Store IDs for the layer and the item
					if(!d.id) d.id = parseInt(sh)+':'+i;
					for(axis = 0; axis < axes.length; axis++){
						a = axes[axis];
						a1 = a+'1';
						a2 = a+'2';
						if(d.data[a]!=null){

							v = self.getPos(a,d.data[a]);

							d.props[a] = parseFloat(v.toFixed(1));

							// Add properties for rule lines
							if(self.marks[sh].type=="rule"){
								if(!d.data[a2] && d.data[a]) d.data[a2] = clone(d.data[a]);
							}

							if(typeof d.data[a2]!=="undefined"){
								d.props[a2] = self.getPos(a,d.data[a2]);
								d.props[a1] = v;
								d.props[a] = v + (d.props[a2]-v)/2;
							}else{
								// Clear x1/x2 values in props if they aren't in data
								if(typeof d.props[a2]!=="undefined"){
									d.props[a1] = null;
									d.props[a2] = null;
								}
							}
						}
					}
				}
				series[s].done = i;

				// If we've finished this series we increment the counter
				if(series[s].done >= self.marks[sh].mark.length) s++;
			}

			// Have we finished or should we loop again?
			if(s >= series.length){

				// Done
				self.log.time('redraw');

				// Draw the points
				self.draw(attr.update);

				// Call the callback if we have one
				if(typeof attr.callback==="function") attr.callback.call(self,{});
			}else{
				// Loop again
				if(attr.cancelable) self.timeout.redraw = setTimeout(processChunk,0,self,s,attr);
				else processChunk(self,s,attr);
			}
		}

		// Start processing
		if(attr.cancelable) this.timeout.redraw = setTimeout(processChunk,0,this,0,attr);
		else processChunk(this,0,attr);
	
		return this;
	};

	/**
	 * @desc Calculate all the data
	 * @param {boolean} update - if set to false we don't bother calculating anything
	 */
	Graph.prototype.calculateData = function(update){
		this.log.message('calculateData');
		this.log.time('calculateData');

		if(typeof update!=="boolean") update = true;
		if(!update) return this;
	
		var d,sh,i,v,a,a1,a2,axes,axis;
		axes = ['x','y'];

		for(sh in this.marks){
			if(this.marks[sh]){
				for(i = 0; i < this.marks[sh].mark.length ; i++){
					d = this.marks[sh].mark[i];

					// Store IDs for the layer and the item
					if(!d.id) d.id = parseInt(sh)+':'+i;
					for(axis = 0; axis < axes.length; axis++){
						a = axes[axis];
						a1 = a+'1';
						a2 = a+'2';
						if(d.data[a]!=null){

							v = this.getPos(a,d.data[a]);

							d.props[a] = parseFloat(v.toFixed(1));

							// Add properties for rule lines
							if(this.marks[sh].type=="rule"){
								if(!d.data[a2] && d.data[a]) d.data[a2] = clone(d.data[a]);
							}

							if(typeof d.data[a2]!=="undefined"){
								d.props[a2] = this.getPos(a,d.data[a2]);
								d.props[a1] = v;
								d.props[a] = v + (d.props[a2]-v)/2;
							}else{
								// Clear x1/x2 values in props if they aren't in data
								if(typeof d.props[a2]!=="undefined"){
									d.props[a1] = null;
									d.props[a2] = null;
								}
							}
						}
					}
				}
			}
		}

		this.log.time('calculateData');

		return this;
	};

	/**
	 * @desc Draw the data onto the graph
	 * @param {boolean} updateLookup - do we update the pixel-based lookup? It can take a while so if a quick update is needed set this to false.
	 */
	Graph.prototype.drawData = function(updateLookup){

		var p,sh,ctx,i,j,m,update,px,quickdraw,colour;
		// Define an empty pixel-based lookup table
		if(updateLookup){
			// If the size of the lookup hasn't changed, we can just set everything to null
			if(this.lookup && this.lookup.length==this.canvas.c.width && this.lookup[0].length==this.canvas.c.height){
				for(i = 0; i < this.canvas.c.width; i++) {
					for(j = 0; j < this.canvas.c.height; j++) this.lookup[i][j] = null;
				}
			}else{
				this.lookup = [];
				for(i = 0; i < this.canvas.c.width; i++) {
					this.lookup[i] = [];
					for(j = 0; j < this.canvas.c.height; j++) this.lookup[i][j] = null;
				}
			}
		}
		// Clear the data canvas
		this.clear(this.paper.data.ctx);
		this.paper.data.scale = {'x':1,'y':1};
		ctx = this.canvas.ctx;

		for(sh in this.marks){
			if(this.marks[sh].show && this.marks[sh].include){
				this.log.time('drawData '+sh);
				this.setCanvasStyles(this.paper.data.ctx,this.marks[sh].mark[0]);
				this.setCanvasStyles(this.paper.temp.ctx,this.marks[sh].mark[0]);

				// Build the clip path for this marker layer
				if(this.marks[sh].clip){
					this.paper.data.ctx.save();
					this.paper.data.ctx.beginPath();
					this.paper.data.ctx.rect(this.chart.left,this.chart.top,this.chart.width,this.chart.height);
					this.paper.data.ctx.clip();
				}

				// Draw lines
				if(this.marks[sh].type=="line") this.drawLine(sh,{'update':true});
				if(this.marks[sh].type=="rule") this.drawRule(sh,{'update':true});
				if(this.marks[sh].type=="area") this.drawArea(sh,{'update':true});
				if(this.marks[sh].type=="symbol" || this.marks[sh].type=="rect" || this.marks[sh].type=="text"){
					// Work out if we need to update this lookup for these marks
					update = (updateLookup && typeof this.marks[sh].hover==="function" && this.marks[sh].interactive);
				
					quickdraw = (this.log.metrics['drawData '+sh].av > 70);
					if(quickdraw){
						px = this.paper.data.ctx.getImageData(0, 0, 1, 1);
						colour = getRGB(this.marks[sh].mark[0].props.format.fill,this.marks[sh].mark[0].props.format.fillOpacity);
						for(i = 0; i < 4; i+=4){
							px.data[i + 0] = colour.r;
							px.data[i + 1] = colour.g;
							px.data[i + 2] = colour.b;
							px.data[i + 3] = colour.a*255;
						}
					}
					// Loop over points drawing them
					for(i = 0; i < this.marks[sh].mark.length ; i++){
						m = this.marks[sh].mark[i];
						p = m.props;
						if(p.x && p.y){
							if(this.marks[sh].type=="symbol"){
								// If this layer is taking too long to update we'll make the symbol simpler
								if(quickdraw){
									if(p.x >= this.chart.left && p.x <= this.chart.left+this.chart.width && p.y >= this.chart.top && p.y <= this.chart.top+this.chart.height) this.paper.data.ctx.putImageData(px, p.x*this.canvas.scale, p.y*this.canvas.scale);
								}else this.drawShape(m,{'update':update});
							}
							if(this.marks[sh].type=="rect") this.drawRect(m,{'update':update});
							if(this.marks[sh].type=="text") this.drawText(m,{'update':update});
						}
					}
				}
				this.log.time('drawData '+sh);
				// Apply the clipping if set
				if(this.marks[sh].clip) this.paper.data.ctx.restore();
			}
		}
		// Draw the data canvas to the main canvas
		try { this.canvas.ctx.drawImage(this.paper.data.c,0,0,this.paper.data.width,this.paper.data.height); }catch(e){ }

		return this;
	};

	/**
	 * @desc Remove the canvas from DOM
	 */
	Graph.prototype.remove = function(){
		this.canvas.canvasholder.remove();
		return {};
	};

	/**
	 * @desc Draw a rectangle
	 * @param {object} datum - the data point's attributes
	 * @param {object} attr - extra attributes
	 * @param {context} attr.ctx - the context of the canvas
	 * @param {number} attr.x - the x-axis centre value (used in conjunction with datum.props.format.width)
	 * @param {number} attr.y - the y-axis centre value (used in conjunction with datum.props.format.height)
	 * @param {number} attr.x1 - the x-axis value x1 value
	 * @param {number} attr.y1 - the y-axis value y1 value
	 * @param {number} attr.x2 - the x-axis value x2 value
	 * @param {number} attr.y2 - the y-axis value y2 value
	 * @param {boolean} attr.update - do we need to update the pixel-lookup?
	 */
	Graph.prototype.drawRect = function(datum,attr){
		var x1,y1,x2,y2,dx,dy,o,ctx,n,l,r,t,b,ok;
		n = "number";
		ctx = (attr.ctx || this.paper.data.ctx);
		if(is(attr.x,n)) datum.props.x = attr.x;
		if(is(attr.y,n)) datum.props.y = attr.y;
		if(is(attr.x1,n)) datum.props.x1 = attr.x1;
		if(is(attr.y1,n)) datum.props.y1 = attr.y1;
		if(is(attr.x2,n)) datum.props.x2 = attr.x2;
		if(is(attr.y2,n)) datum.props.y2 = attr.y2;
		if(is(datum.props.x2,n) || is(datum.props.y2,n)){
			x1 = is(datum.props.x1,n) ? datum.props.x1 : datum.props.x;
			y1 = is(datum.props.y1,n) ? datum.props.y1 : datum.props.y;
			x2 = is(datum.props.x2,n) ? datum.props.x2 : x1;
			y2 = is(datum.props.y2,n) ? datum.props.y2 : y1;
			dx = (x2-x1);
			dy = (y2-y1);

			// Use provided width/height
			if(datum.props.format.width){
				x1 = x1+(dx-datum.props.format.width)/2;
				dx = datum.props.format.width;
			}
			if(datum.props.format.height){
				y1 = y1+(dy-datum.props.format.height)/2;
				dy = datum.props.format.height;
			}

			// Bail out if it is outside the chart area
			l = 0;
			r = this.canvas.wide;
			t = 0;
			b = this.canvas.tall;
			ok = false;
			if((x2 >= l && x1 <= r) || (y1 >= b && y2 <= t) || (datum.props.x+dx > l && datum.props.x-dx < r) || (datum.props.y+dy > t && datum.props.y-dy < b)) ok = true;
			if(!ok) return {};

			ctx.beginPath();
			ctx.rect(x1,y1,dx,dy);
			ctx.fill();
			ctx.closePath();
			o = {id:datum.id,xa:Math.floor(x1-dx/2),xb:Math.ceil(x1+dx/2),ya:Math.floor(y2),yb:Math.ceil(y1),w:1};
			if(attr.update) this.addRectToLookup(o);
			return o;
		}
		return "";
	};

	/**
	 * @desc Draw a rule
	 * @param {number} sh - the index of the mark set
	 * @param {context} attr.ctx - the context of the canvas
	 * @param {boolean} attr.update - do we need to update the pixel-lookup?
	 */
	Graph.prototype.drawRule = function(sh,attr){
		if(!attr) attr = {};
		var ctx,i,p;
		ctx = (attr.ctx || this.paper.data.ctx);
		this.clear(this.paper.temp.ctx);
		this.paper.temp.ctx.beginPath();
		for(i = 0; i < this.marks[sh].mark.length ; i++){
			p = this.marks[sh].mark[i].props;
			if(this.marks[sh].mark[i].data.x){
				if(!this.marks[sh].mark[i].data.x.scale){
					if(this.marks[sh].mark[i].data.x.value == 0) p.x1 = this.chart.left;
					if(this.marks[sh].mark[i].data.x2.field && this.marks[sh].mark[i].data.x2.field.group=="width") p.x2 = this.chart.width+this.chart.left;
				}
			}
			if(this.marks[sh].mark[i].data.y){
				if(!this.marks[sh].mark[i].data.y.scale){
					if(this.marks[sh].mark[i].data.y.value == 0) p.y1 = this.chart.top;
					if(this.marks[sh].mark[i].data.y2.field && this.marks[sh].mark[i].data.y2.field.group=="height") p.y2 = this.chart.height+this.chart.top;
				}
			}
			if(isNaN(p.x)){
				p.x1 = this.chart.left;
				p.x2 = this.chart.width+this.chart.left;
			}
			if(isNaN(p.y)){
				p.y1 = this.chart.top;
				p.y2 = this.chart.height+this.chart.top;
			}
			if(!p.x1) p.x1 = p.x;
			if(!p.x2) p.x2 = p.x;
			if(!p.y1) p.y1 = p.y;
			if(!p.y2) p.y2 = p.y;
			if(p.x1 && p.y1) this.paper.temp.ctx.moveTo(p.x1,p.y1);
			if(p.x2 && p.y2) this.paper.temp.ctx.lineTo(p.x2,p.y2);
		}
		this.paper.temp.ctx.stroke();
		ctx.drawImage(this.paper.temp.c,0,0,this.paper.temp.width,this.paper.temp.height);

		if(attr.update) this.addTempToLookup({'id':this.marks[sh].mark[0].id, 'weight':0.6});
		return this;
	};

	/**
	 * @desc Draw a visible line segment (deprecated)
	 * @param {number} ax - starting x position
	 * @param {number} ay - starting y position
	 * @param {number} bx - ending x position
	 * @param {number} by - ending y position
	 */
	Graph.prototype.drawVisibleLineSegment = function(ax,ay,bx,by){
		// If the two points are both off to the left, right, top, or bottom the line won't be visible
		if((ax < 0 && bx < 0) || (ax > this.canvas.wide && bx > this.canvas.wide) || (ay < 0 && by < 0) || (ay > this.canvas.tall && by > this.canvas.tall)) return 0;
		// Truncate left edge of the line
		if(ax < 0){
			ay = ay + (by-ay)*(Math.abs(ax)/(bx-ax));
			ax = 0;
		}
		// Truncate right edge of the line
		if(bx > this.canvas.wide){
			by = ay + (by-ay)*((this.canvas.wide-ax)/(bx-ax));
			bx = this.canvas.wide;
		}
		// Truncate top edge of the line
		if(ay < 0){
			ax = ax + (bx-ax)*(Math.abs(ay)/(by-ay));
			ay = 0;
		}
		// Truncate bottom edge of the line
		if(by > this.canvas.tall){
			bx = ax + (bx-ax)*((this.canvas.tall-ay)/(by-ay));
			by = this.canvas.tall;
		}
		this.paper.temp.ctx.moveTo(ax,ay);
		this.paper.temp.ctx.lineTo(bx,by);
		return 1;
	};

	/**
	 * @desc Draw a line
	 * @param {number} sh - the index of the mark set
	 * @param {context} attr.ctx - the context of the canvas
	 * @param {boolean} attr.update - do we need to update the pixel-lookup?
	 */
	Graph.prototype.drawLine = function(sh,attr){
		var ctx,ps,oldp,i,p;
		ctx = (attr.ctx || this.paper.data.ctx);
		this.clear(this.paper.temp.ctx);
		this.paper.temp.ctx.beginPath();
		ps = this.marks[sh].mark;
		oldp = ps[0].props;
		this.paper.temp.ctx.moveTo(oldp.x,oldp.y);
		for(i = 1; i < ps.length ; i++){
			p = ps[i].props;
			if(!isNaN(oldp.x) && !isNaN(p.x)) this.paper.temp.ctx.lineTo(p.x,p.y);
			oldp = p;
		}
		this.paper.temp.ctx.stroke();
		ctx.drawImage(this.paper.temp.c,0,0,this.paper.temp.width,this.paper.temp.height);

		if(attr.update) this.addTempToLookup({'id':this.marks[sh].mark[0].id, 'weight':0.6});

		return this;
	};

	/**
	 * @desc Draw an area on the chart
	 * @param {number} sh - the index of the mark set
	 * @param {context} attr.ctx - the context of the canvas
	 * @param {boolean} attr.update - do we need to update the pixel-lookup?
	 */
	Graph.prototype.drawArea = function(sh,attr){
		var ctx,oldp,areas,a,i,j,k,p,y1,y2;
		ctx = (attr.ctx || this.paper.data.ctx);
		this.clear(this.paper.temp.ctx);
		this.paper.temp.ctx.beginPath();
		oldp = {};
		areas = [];
		// We need to loop across the data first splitting into segments
		for(i = 0, a = 0; i < this.marks[sh].mark.length ; i++){
			p = this.marks[sh].mark[i].props;
			y1 = (p.y1 || p.y);
			y2 = p.y2;
			if(!isNaN(p.x) && !isNaN(y1) && !isNaN(y2)){
				if(!areas[a]) areas[a] = [];
				areas[a].push(i);
			}else a++;
		}
		// To do: make the polygon lookup processing more efficient by
		// not processing the entire shape in one go
		var poly = new Array(areas.length);
		for(a = 0; a < areas.length ; a++){
			if(areas[a] && areas[a].length){
				poly[a] = new Array(areas[a].length*2);
				// Move along top of area (y2 coordinates)
				k = 0;
				for(j = 0; j < areas[a].length; j++,k++){
					p = this.marks[sh].mark[areas[a][j]].props;
					poly[a][k] = [p.x,p.y2];
				}
				// Move along bottom of area backwards
				for(j = areas[a].length-1; j >= 0; j--,k++){
					p = this.marks[sh].mark[areas[a][j]].props;
					p.y1 = (p.y1 || p.y);
					poly[a][k] = [p.x,p.y1];
				}
			}
		}
		// Draw each polygon
		for(a = 0; a < poly.length; a++){
			if(poly[a]){
				for(j = 0; j < poly[a].length; j++){
					if(j==0) this.paper.temp.ctx.moveTo(poly[a][j][0],poly[a][j][1]);
					else this.paper.temp.ctx.lineTo(poly[a][j][0],poly[a][j][1]);
				}
			}
		}

		this.paper.temp.ctx.fill();
		if(this.marks[sh].mark[0].props.format.strokeWidth > 0) this.paper.temp.ctx.stroke();
	
		ctx.drawImage(this.paper.temp.c,0,0,this.paper.temp.width,this.paper.temp.height);

		if(attr.update) this.addTempToLookup({'id':this.marks[sh].mark[0].id, 'weight':0.4});

		return this;
	};

	/**
	 * @desc Draw text on the chart
	 * @param {object} datum - the data point
	 * @param {number} datum.props.x - the x-axis value to draw the text
	 * @param {number} datum.props.y - the y-axis value to draw the text
	 * @param {number} attr.x - over-ride the x-axis value
	 * @param {number} attr.y - over-ride the y-axis value
	 * @param {context} attr.ctx - the context of the canvas
	 * @param {boolean} attr.update - do we need to update the pixel-lookup?
	 */
	Graph.prototype.drawText = function(datum,attr){
		var ctx,t,f,o,x,y;
		ctx = (attr.ctx || this.paper.data.ctx);
		x = (attr.x || datum.props.x);
		y = (attr.y || datum.props.y);
		t = (attr.text || datum.data.text || "Label");
		f = JSON.parse(JSON.stringify(datum.props.format));
		if(attr.props) f.extend(attr.props);
		o = this.drawTextLabel(t,x,y,{'ctx':ctx,'format':f});
		o.id = datum.id;
		o.weight = 1;
		if(attr.update) this.addRectToLookup(o);
		return o;
	};

	/**
	 * @desc Draw a text label
	 * @param {string} txt - the text to show
	 * @param {number} x - the x-axis value to draw the text
	 * @param {number} y - the y-axis value to draw the text
	 * @param {context} attr.ctx - the context of the canvas
	 * @param {object} attr.format - formatting properties for the text
	 * @param {string} attr.format.font - the font family to use
	 * @param {string} attr.format.fontSize - the font size to use
	 * @param {string} attr.format.fontWeight - the font weight to use
	 * @param {string} attr.format.align - the text alignment
	 * @param {string} attr.format.baseline - the text baseline
	 */
	Graph.prototype.drawTextLabel = function(txt,x,y,attr){
		if(!attr) attr = {};
		var str,w,b,l,bits,f,fs,s,ctx,dy;

		ctx = (attr.ctx||this.canvas.ctx);
		f = (attr.format || {});
		if(!f.font) f.font = this.chart.fontfamily;
		if(!f.fontSize) f.fontSize = this.chart.fontsize*this.fontscale;
		if(!f.fontWeight) f.fontWeight = "bold";
		if(!f.align) f.align = "center";
		if(!f.baseline) f.baseline = "middle";

		// Deal with superscript
		if(!txt) txt = "";
		if(typeof txt==="object" && txt.value) txt = txt.value;
		str = (typeof txt==="string" ? 'NORMAL==='+txt.replace(/([\^\_])\{([^\}]*)\}/g,function(m,p1,p2){ var t = (p1=="^" ? 'SUP':'SUB');return '%%'+t+'==='+p2+'%%NORMAL==='; }):'');
		str = str.replace(/%%NORMAL===$/,"");
		bits = str.split(/%%/);

		w = 0;
		// Calculate the width of the text
		for(b = 0; b < bits.length; b++){
			bits[b] = bits[b].split("===");
			if(f.fontSize && f.font){
				fs = (bits[b][0]=="NORMAL" ? 1 : 0.8)*f.fontSize;
				ctx.font = buildFont(f);
			}
			w += ctx.measureText(bits[b][1]).width;
		}

		// Starting x-position
		var xo = x + (f.dx||0);
		if(f.align == "center") xo -= w/2;
		if(f.align == "right") xo -= w;
		//if(f.baseline == "top") ;
		// We've taken control of the positioning
		ctx.textAlign = "left";
		ctx.textBaseline = f.baseline;

		for(b=0,l=xo; b < bits.length; b++){
			s = (bits[b][0]=="NORMAL" ? 1 : 0.6);
			fs = s*f.fontSize;
			dy = 0;
			if(bits[b][0] == "SUP") dy = -(1-s)*f.fontSize;
			if(bits[b][0] == "SUB") dy = (1-s)*f.fontSize;
			ctx.font = f.fontWeight+' '+Math.round(fs)+'px '+f.font;
			ctx.fillText(bits[b][1],l,y+dy);
			l += ctx.measureText(bits[b][1]).width;
		}
		return {xa:Math.floor(xo),xb:Math.ceil(l),ya:Math.floor(y),yb:Math.ceil(y + f.fontSize)};
	};

	/**
	 * @desc Draw a shape
	 * @param {object} datum - the data point
	 * @param {number} datum.id - the index of the data point
	 * @param {string} data.props.symbol.shape - the shape to draw e.g. "circle", "rect", "cross", "diamond", "triangle-up", "triangle-down", "triangle-left", and "triangle-right"
	 * @param {number} datum.props.x - the x-axis value to draw the data point (use with width or x2)
	 * @param {number} datum.props.y - the y-axis value to draw the data point (use with height or y2)
	 * @param {number} datum.props.x2 - the second x value for type "rect" (used with x)
	 * @param {number} datum.props.y2 - the second y value for type "rect" (used with y)
	 * @param {number} datum.props.xc - a centre x value for type "rect" (used with width)
	 * @param {number} datum.props.yc - a centre y value for type "rect" (used with height)
	 * @param {number} datum.props.format.size - the size of the object (related to area)
	 * @param {number} datum.props.format.width - default width used for type "rect"
	 * @param {number} datum.props.format.height - default height for type "rect"
	 * @param {number} datum.props.width - width used for type "rect"
	 * @param {number} datum.props.height - height for type "rect"
	 * @param {number} attr.x - over-ride the x-axis value
	 * @param {number} attr.y - over-ride the y-axis value
	 * @param {context} attr.ctx - the context of the canvas (default is this.paper.data.ctx)
	 * @param {boolean} attr.update - do we need to update the pixel-lookup?
	 */
	Graph.prototype.drawShape = function(datum,attr){
		if(!attr.ctx) attr.ctx = this.paper.data.ctx;
		var ctx,p,x1,y1,s,w,h,o,dw,s2;
		ctx = attr.ctx;
		p = datum.props;
	
		x1 = (typeof attr.x==="number") ? attr.x : p.x;
		y1 = (typeof attr.y==="number") ? attr.y : p.y;
	
		ctx.moveTo(x1,y1);
		ctx.beginPath();

		var shape = p.symbol.shape;

		w = s = h = (Math.sqrt(p.format.size) || 4);
		s2 = s*2;

		// Bail out if the symbol is off the chart
		if(x1+s2 < 0 || x1-s2 > this.chart.left+this.chart.width || y1+s2 < 0 || y1-s2 > this.chart.top+this.chart.height) return {};

		function m(a,b){ ctx.moveTo(x1+a,y1+b); }
		function l(a,b){ ctx.lineTo(x1+a,y1+b); }

		if(shape=="circle"){
			ctx.arc(x1,y1,(s/2 || 4),0,Math.PI*2,false);
		}else if(shape=="rect"){
			w = p.format.width || s;
			h = p.format.height || w;
			if(p.x2) w = p.x2-p.x1;
			else if(p.width && p.x){ w = p.width; x1 = p.x - p.width/2; }
			else if(p.width && p.xc){ w = p.width; x1 = p.xc - p.width/2; }
			else{ x1 = x1 - w/2; }

			if(p.y2) h = p.y2-p.y1;
			else if(p.height && p.y){ h = p.height; y1 = p.y - p.height/2; }
			else if(p.height && p.yc){ h = p.height; y1 = p.yc - p.height/2; }
			else{ y1 = y1 - h/2; }

			ctx.rect(x1,y1,w,h);
		}else if(shape=="cross"){
			dw = w/6;
			m(dw,dw);
			l(dw*3,dw);
			l(dw*3,-dw);
			l(dw,-dw);
			l(dw,-dw*3);
			l(-dw,-dw*3);
			l(-dw,-dw);
			l(-dw*3,-dw);
			l(-dw*3,dw);
			l(-dw,dw);
			l(-dw,dw*3);
			l(dw,dw*3);
		}else if(shape=="diamond"){
			w *= Math.sqrt(2)/2;
			m(0,w);
			l(w,0);
			l(0,-w);
			l(-w,0);
		}else if(shape=="triangle-up"){
			w /= 3;
			m(0,-w*1.5);
			l(w*2,w*1.5);
			l(-w*2,w*1.5);
		}else if(shape=="triangle-down"){
			w /=3;
			m(0,w*1.5);
			l(w*2,-w*1.5);
			l(-w*2,-w*1.5);
		}else if(shape=="triangle-left"){
			w /= 3;
			m(w*1.5,w*1.5);
			l(w*1.5,-w*1.5);
			l(-w*1.5,0);
		}else if(shape=="triangle-right"){
			w /= 3;
			m(-w*1.5,w*1.5);
			l(-w*1.5,-w*1.5);
			l(w*1.5,0);
		}
		ctx.fill();

		o = {id:datum.id,xa:Math.floor(x1-w/2),xb:Math.ceil(x1+w/2),ya:Math.floor(y1-h/2),yb:Math.ceil(y1+h/2)};
		if(attr.update) this.addRectToLookup(o);
		return o;
	};

	/**
	 * @desc Use the temporary canvas to build the lookup (make sure you've cleared it before writing to it)
	 * @param {number} attr.id - the index of this data point
	 * @param {number} attr.weight - the weighting for this data point at this pixel
	 */
	Graph.prototype.addTempToLookup = function(attr){
		if(!attr.id) return;
		var a,px,i,p,x,y,l,w,h;
		a = attr.id+':'+(attr.weight||1);
		w = this.canvas.c.width;
		h = this.canvas.c.height;
		px = this.paper.temp.ctx.getImageData(0,0,w,h);
		l = px.data.length;
		for(i = p = x = y = 0; i < l; i+=4, p++, x++){
			if(x == w){
				x = 0;
				y++;
			}
			if(px.data[i] || px.data[i+1] || px.data[i+2] || px.data[i+3]){
				if(x < w && y < h){
					if(this.lookup[x][y] == null) this.lookup[x][y] = [a];
					else this.lookup[x][y].push(a);
				}
			}
		}
		return this;
	};

	/**
	 * @desc Use a bounding box to define the lookup area
	 * @param {object} i - the datum to use
	 * @param {number} i.id - the index of this data point
	 * @param {number} i.xa - the starting x value
	 * @param {number} i.xb - the ending x value
	 * @param {number} i.ya - the starting y value
	 * @param {number} i.yb - the ending y value
	 * @param {number} i.weight - the weighting for this data point at this pixel
	 */
	Graph.prototype.addRectToLookup = function(i){
		if(!i.id) return;
		var x,y,p,a,t,dir,bit;
		p = 1;
		a = i.id+':'+(i.weight||1);
		if(i.xb < i.xa){ t = i.xa; i.xa = i.xb; i.xb = t; }
		if(i.yb < i.ya){ t = i.ya; i.ya = i.yb; i.yb = t; }

		for(dir in {'x':'','y':''}){
			if(dir){
				for(bit in {'a':'','b':''}){
					if(bit){
						i[dir+''+bit] *= this.canvas.scale;
						i[dir+''+bit] = (bit == "a") ? Math.floor(i[dir+''+bit]) : Math.ceil(i[dir+''+bit]);
					}
				}
			}
		}

		i.xb += p*2;
		i.xb = Math.min(i.xb,this.canvas.c.width-1);
		i.ya -= p;
		i.yb += p;
		if(i.xa < 0) i.xa = 0;
		if(i.ya < 0) i.ya = 0;
		// Clip to chart
		i.yb = Math.min(i.yb,(this.chart.top+this.chart.height)*this.canvas.scale);
		// Use bounding box to define the lookup area
		for(x = i.xa; x < i.xb; x++){
			for(y = i.ya; y < i.yb; y++){
				if(this.lookup[x][y] == null) this.lookup[x][y] = [a];
				else this.lookup[x][y].push(a);
			}
		}
		return this;
	};

	/**
	 * @desc Clear the canvas
	 */
	Graph.prototype.clear = function(ctx){
		var w,h;
		w = ctx ? ctx.canvas.width : this.canvas.wide;
		h = ctx ? ctx.canvas.height : this.canvas.tall;
		ctx = (ctx || this.canvas.ctx);
		ctx.clearRect(0,0,w,h);
		return this;
	};

	/**
	 * @desc Draw everything - the axes, the data, and overlays
	 * @param {boolean} updateLookup - do we need to update the pixel lookup?
	 */
	Graph.prototype.draw = function(updateLookup){
		this.log.time('draw');
		this.clear();
		this.drawAxes();
		this.drawData(updateLookup);
		if(updateLookup) this.canvas.copyToClipboard();
		this.log.time('draw');
		return this;
	};

	/**
	 * @desc Tidy up a string with rounding errors
	 * @param {string} v - the string to tidy
	 */
	function tidy(v){
		if(typeof v!=="string") return "";
		if(v=="0") return v;
		return v.replace(/\.0+e/,"e").replace(/\.0{6}[0-9]+e/,"e").replace(/([0-9]+)\.9{6}[0-9]+e/,function(m,p1){ var val = parseFloat(p1); return (val+(val < 0 ? -1 : 1))+"e"; }).replace(/(\.[1-9]+)0+e/,function(m,p1){ return p1+"e"; }).replace(/\.0$/,"").replace(/\.([0-9]+?)0+$/g,function(m,p1){ return "."+p1; });
	}

	/**
	 * @desc Remove rounding errors from a string
	 * @param {number} e - the value tidy
	 */
	function removeRoundingErrors(e){
		return (e) ? e.toString().replace(/(\.[0-9]+[1-9])[0]{6,}[1-9]*/,function(m,p1){ return p1; }).replace(/(\.[0-9]+[0-8])[9]{6,}[0-8]*/,function(m,p1){ var l = (p1.length-1); return parseFloat(p1).toFixed(l); }).replace(/^0+([0-9]+\.)/g,function(m,p1){ return p1; }) : "";
	}

	/**
	 * @desc Build the canvas font string
	 * @param {string} f.fontWeight - the weight of the font e.g. "bold"
	 * @param {number} f.fontSize - the font size in pixels
	 * @param {string} f.font - the font family
	 */
	function buildFont(f){ return f.fontWeight+" "+f.fontSize+"px "+f.font; }

	/**
	 * @desc Get some spacing given a minimum and maximum value
	 * @param {number} mn - the minimum value
	 * @param {number} mx - the maximum value
	 * @param {number} n - the minimum number of steps
	 */
	function defaultSpacing(mn,mx,n){

		var dv,log10_dv,base,frac,options,distance,imin,tmin,i;

		// Start off by finding the exact spacing
		dv = Math.abs(mx - mn) / n;

		// In any given order of magnitude interval, we allow the spacing to be
		// 1, 2, 5, or 10 (since all divide 10 evenly). We start off by finding the
		// log of the spacing value, then splitting this into the integer and
		// fractional part (note that for negative values, we consider the base to
		// be the next value 'down' where down is more negative, so -3.6 would be
		// split into -4 and 0.4).
		log10_dv = Math.log10(dv);
		base = Math.floor(log10_dv);
		frac = log10_dv - base;

		// We now want to check whether frac falls closest to 1, 2, 5, or 10 (in log
		// space). There are more efficient ways of doing this but this is just for clarity.
		options = [1,2,5,10];
		distance = new Array(options.length);
		imin = -1;
		tmin = 1e100;
		for(i = 0; i < options.length; i++){
			distance[i] = Math.abs(frac - Math.log10(options[i]));
			if(distance[i] < tmin){
				tmin = distance[i];
				imin = i;
			}
		}

		// Now determine the actual spacing
		return Math.pow(10,(base))*options[imin];
	}

	/**
	 * @desc Round the date to a suitable place
	 * @param {number} s - the date (also as a <code>Num</code>)
	 * @param {object} attr - some attributes
	 * @param {number} attr.range - the time range in seconds
	 * @param {number} attr.inc - the increment size
	 * @param {number} attr.n - spacing between ticks in multiples of 'unit'
	 * @param {number} attr.unit - the unit of rounding e.g. "years", "months", "seconds", "decimal"
	 * @param {number} attr.method - the rounding method e.g. "floor"
	*/
	function roundDate(s,attr){
		var d,d2,df,a,a2,time,f,months,ly,ms,bits,idx,str;
		str = (typeof s==="number" ? Num(s):s).toString();
		idx = str.indexOf(".");
		bits = [Num(str),Num(0)];
		if(idx >= 0) bits = [Num(str.substr(0,idx)),Num("0."+str.substr(idx+1,str.length-1))];
		if(!attr) attr = {};
		if(!attr.method) attr.method = "round";
		if(!attr.n || attr.n < 1) attr.n = 1;
		if(!attr.range) attr.range = 1;

		// If we are in the sub-second range we'll 
		// just do some simple number-based rounding
		if(attr.range < 2){
			if(!attr.inc){
				console.log('ERROR','No increment provided');
				return "";
			}
			a = bits[1].div(attr.inc).round(0,(attr.method=="floor" ? 0 : 3)).times(attr.inc);
			return bits[0].plus(a);
		}

		// If the range is larger than a second we
		// want to process this as a date properly
		ms = bits[0].toValue()*1000;

		time = new Date(ms);
		d = { 'dow': time.getUTCDay(), 'h': time.getUTCHours(), 'm': time.getUTCMinutes(), 's': (time.getUTCSeconds()+time.getUTCMilliseconds()/1000), 'ms': time.getUTCMilliseconds(), 'dd': time.getUTCDate(), 'mm': time.getUTCMonth(), 'yy': time.getUTCFullYear() };
		df = Num(0);
		ly = false;
		if(d.yy%4==0) ly = true;
		if(d.yy%100==0) ly = false;
		if(d.yy%400==0) ly = true;
		months = [31,(ly ? 29 : 28),31,30,31,30,31,31,30,31,30,31];
		// Round to nearest block
		if(attr.unit == "years"){
			a = d.yy + (d.mm + (d.dd + (d.h+((d.m+(d.s/60))/60))/24)/months[d.mm])/12;
			a2 = Math[attr.method].call([],a/attr.n)*attr.n;
			// There is no year zero
			if(a2 == 0) a2 = 1;
			d2 = new Date(zeroFill(a2,4)+'-01-01');
			df = Num(time-d2).div(1000);
		}else if(attr.unit == "months"){
			a = d.mm + d.dd/months[d.mm];
			a2 = (Math[attr.method].call([],a/attr.n)*attr.n + 1);
			if(a2 > 12){
				d.yy += Math.floor(a2/12);
				a2 = a2%12;
			}
			d2 = new Date(d.yy+'-'+zeroFill(a2,2)+'-01');
			df = Num(time-d2).div(1000);
		}else if(attr.unit == "weeks"){
			a = (d.dow + (d.h+((d.m+(d.s/60))/60))/24);
			a2 = Math[attr.method].call([],a/(attr.n*7))*(attr.n*7);
			f = 86400000;
			df = Num(Math.round((a-a2)*f)).div(1000);
		}else{
			f = 1;
			if(attr.unit == "nanoseconds"){ a = d.s; f = 1e-9; }
			else if(attr.unit == "microseconds"){ a = d.s; f = 1e-6; }
			else if(attr.unit == "milliseconds"){ a = d.s; f = 1e-3; }
			else if(attr.unit == "seconds"){ a = d.s; f = 1; }
			else if(attr.unit == "minutes"){ a = d.m + d.s/60; f = 60; }
			else if(attr.unit == "hours"){ a = d.h + (d.m+(d.s/60))/60; f = 3600; }
			else if(attr.unit == "days"){ a = d.dd + (d.h+((d.m+(d.s/60))/60))/24; f = 86400; }
			else{ a = d.s; f = 1; }
		
			a = Num(a).plus(bits[1].div(f));
			a2 = a.div(attr.n).round(0,(attr.method=="floor" ? 0 : 3)).times(attr.n).times(f);
			a = a.times(f);

			df = a.minus(a2).round(0,(attr.method=="floor" ? 0 : 3));
		}

		return bits[0].minus(df);
	}

	/**
	 * @desc Prevent scrolling on mouse wheel events
	 */
	function preventDefault(e) {
		e = e || window.event;
		if (e.preventDefault) e.preventDefault();
		e.returnValue = false;  
	}

	/**
	 * @desc Disable the scroll event
	 */
	function disableScroll() {
		if(window.addEventListener) window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
		window.onwheel = preventDefault; // modern standard
		window.onmousewheel = document.onmousewheel = preventDefault; // older browsers, IE
		window.ontouchmove  = preventDefault; // mobile
	}

	/**
	 * @desc Enable the scroll event
	 */
	function enableScroll() {
		if(window.removeEventListener) window.removeEventListener('DOMMouseScroll', preventDefault, false);
		window.onmousewheel = document.onmousewheel = null; 
		window.onwheel = null; 
		window.ontouchmove = null;  
	}

	/**
	 * @desc Create a logger for console messages and timing
	 * @param {boolean} inp.logging - do we log messages to the console?
	 * @param {boolean} inp.logtime - do we want to log execution times?
	 * @param {string} inp.id - an ID to use for the log messages (default "JS")
	 */
	function Logger(inp){
		if(!inp) inp = {};
		this.logging = (inp.logging||false);
		this.logtime = (inp.logtime||false);
		this.id = (inp.id||"JS");
		this.metrics = {};
		this.error = function(){ this.log('ERROR',arguments); };
		this.warning = function(){ this.log('WARNING',arguments); };
		this.info = function(){ this.log('INFO',arguments); };
		this.message = function(){ this.log('MESSAGE',arguments); };
		return this;
	}

	/**
	 * @desc A wrapper for log messages. The first argument is the type of message e.g. "ERROR", "WARNING", "INFO", or "MESSAGE". Other arguments are any objects/values you want to include.
	 */
	Logger.prototype.log = function(){
		if(this.logging || arguments[0]=="ERROR" || arguments[0]=="WARNING" || arguments[0]=="INFO"){
			var args,args2,bold;
			args = Array.prototype.slice.call(arguments[1], 0);
			args2 = (args.length > 1 ? args.splice(1):"");
			// Remove array if only 1 element
			if(args2.length == 1) args2 = args2[0];
			bold = 'font-weight:bold;';
			if(console && typeof console.log==="function"){
				if(arguments[0] == "ERROR") console.error('%c'+this.id+'%c: '+args[0],bold,'',args2);
				else if(arguments[0] == "WARNING") console.warn('%c'+this.id+'%c: '+args[0],bold,'',args2);
				else if(arguments[0] == "INFO") console.info('%c'+this.id+'%c: '+args[0],bold,'',args2);
				else console.log('%c'+this.id+'%c: '+args[0],bold,'',args2);
			}
		}
		return this;
	};

	/**
	 * @desc Start/stop a timer. This will build metrics for the key containing the start time ("start"), weighted average ("av"), and recent durations ("times")
	 * @param {string} key - the key for this timer
	 */
	Logger.prototype.time = function(key){
		if(!this.metrics[key]) this.metrics[key] = {'times':[],'start':''};
		if(!this.metrics[key].start) this.metrics[key].start = new Date();
		else{
			var t,w,v,tot,l,i,ts;
			t = ((new Date())-this.metrics[key].start);
			ts = this.metrics[key].times;
			// Define the weights for each time in the array
			w = [1,0.75,0.55,0.4,0.28,0.18,0.1,0.05,0.002];
			// Add this time to the start of the array
			ts.unshift(t);
			// Remove old times from the end
			if(ts.length > w.length-1) ts = ts.slice(0,w.length);
			// Work out the weighted average
			l = ts.length;
			this.metrics[key].av = 0;
			if(l > 0){
				for(i = 0, v = 0, tot = 0 ; i < l ; i++){
					v += ts[i]*w[i];
					tot += w[i];
				}
				this.metrics[key].av = v/tot;
			}
			this.metrics[key].times = ts.splice(0);
			if(this.logtime) this.info(key+' '+t+'ms ('+this.metrics[key].av.toFixed(1)+'ms av)');
			delete this.metrics[key].start;
		}
		return this;
	};

	root.Graph = Graph;
	root.Logger = Logger;

})(window || this);
