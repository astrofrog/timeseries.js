/* graph.js */
(function(root){
	
	// First we will include all the useful helper functions
	
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
		}
		fullScreenApi.requestFullScreen = function(el){ return (this.prefix === '') ? el.requestFullScreen() : el[this.prefix + 'RequestFullScreen'](); }
		fullScreenApi.cancelFullScreen = function(el){ return (this.prefix === '') ? document.cancelFullScreen() : document[this.prefix + 'CancelFullScreen'](); }
		fullScreenApi.element = function(){ return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement; }
	}
	// export api
	root.fullScreenApi = fullScreenApi;
	// End of Full Screen API

	// Extra mathematical/helper functions that will be useful - inspired by http://alexyoung.github.com/ico/
	var G = {};
	G.sum = function(a) { var i, sum; for (i = 0, sum = 0; i < a.length; sum += a[i++]) {}; return sum; };
	if(typeof Array.prototype.max === 'undefined') G.max = function(a) { return Math.max.apply({}, a); };
	else G.max = function(a) { return a.max(); };
	if(typeof Array.prototype.min === 'undefined') G.min = function(a) { return Math.min.apply({}, a); };
	else G.min = function(a) { return a.min(); };
	G.mean = function(a) { return G.sum(a) / a.length; };
	G.stddev = function(a) { return Math.sqrt(G.variance(a)); };
	G.log10 = function(v) { return Math.log(v)/2.302585092994046; };
	G.variance = function(a) { var mean = G.mean(a), variance = 0; for (var i = 0; i < a.length; i++) variance += Math.pow(a[i] - mean, 2); return variance / (a.length - 1); };
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
		}
	}

	// Define a shortcut for checking variable types
	function is(a,b){ return (typeof a == b) ? true : false; }

	function zeroFill(number, width){
		width -= number.toString().length;
		if(width > 0) return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
		return number + ""; // always return a string
	}
	
	// A non-jQuery dependent function to get a style
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

	// Define the class to deal with <canvas>.
	// i = {
	//    'container': HTMLelement
	// }
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
		var o = "object";
		var f = "function";
		if(is(i.logging,b)) this.logging = i.logging;
		if(is(i.background,t)) this.background = i.background;
		if(is(i.color,t)) this.color = i.color;
		if(is(i.width,n)) this.wide = i.width;
		if(is(i.height,n)) this.tall = i.height;
		if(is(i.fullwindow,b)) this.fullwindow = i.fullwindow;
		if(is(i.transparent,b)) this.transparent = i.transparent;
		if(is(i.scale,n)) this.scale = i.scale;

		this.log('Canvas',container,this.wide,this.tall)

		// Construct the <canvas> container
		this.container = S(container);
		this.log('container width',this.container.width(),this.container[0],container)

		this.origcontainer = this.container[0].outerHTML;
		if(this.container[0].nodeName!=="DIV"){
			this.log('before',this.container,this.wide,this.tall);
			this.container = this.container.replaceWith('<div></div>');
			this.log('after',this.container)
		}

		if(this.container.length == 0){
			this.log('Error - no valid container provided');
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
			this.ctx.fillText(loading,(this.wide-this.ctx.measureText(loading).width)/2,(this.tall-fs)/2)
			this.ctx.fill();
		}

		// Bind events
		this.canvas.on("mousedown",{me:this}, function(e){ e.data.me.trigger("mousedown",{event:e}); });
		this.canvas.on("mousemove",{me:this}, function(e){ e.data.me.trigger("mousemove",{event:e}); });
		this.canvas.on("mouseup",{me:this}, function(e){ e.data.me.trigger("mouseup",{event:e}); });
		this.canvas.on("mouseover",{me:this}, function(e){ e.data.me.trigger("mouseover",{event:e}); });
		this.canvas.on("mouseleave",{me:this}, function(e){ e.data.me.trigger("mouseleave",{event:e}); });
		this.canvasholder.on("wheel",{me:this}, function(e){ e.preventDefault(); e.stopPropagation(); e.data.me.trigger("wheel",{event:e}); });
		if('ontouchstart' in document.documentElement){
			var ongoingTouches = [];
			function ongoingTouchIndexById(idToFind){ for (var i = 0; i < ongoingTouches.length; i++){ var id = ongoingTouches[i].identifier; if(id == idToFind){ return i; } } return -1; }
			function copyTouch(touch){ return { identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY }; }
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
					e.originalEvent = updateEvent(e,touches)
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
					if(touches.length > 0) e.originalEvent = updateEvent(e,touches)
					e.originalEvent.which = 1;
				}else event = lastevent;
				e.data.me.trigger("mouseup",{event:event});
			});
		}
		if(fullScreenApi.supportsFullScreen){
			var _obj = this;
			document.addEventListener(fullScreenApi.fullScreenEventName, function(event){
				_obj.fullscreen = (_obj.container[0] == fullScreenApi.element());
			});
		}
	}
	Canvas.prototype.log = function(){
		if(this.logging){
			var args = Array.prototype.slice.call(arguments, 0);
			if(console && is(console.log,"function")) console.log('%cCanvas%c','font-weight:bold;','',args);
		}
		return this;
	}
	// Attach a handler to an event for the Canvas object in a style similar to that used by jQuery
	//   .on(eventType[,eventData],handler(eventObject));
	//   .on("resize",function(e){ console.log(e); });
	//   .on("resize",{me:this},function(e){ console.log(e.data.me); });
	Canvas.prototype.on = function(ev,e,fn){
		if(typeof ev!="string") return this;
		if(is(fn,"undefined")){
			fn = e;
			e = {};
		}else{
			e = {data:e}
		}
		if(typeof e!="object" || typeof fn!="function") return this;
		if(this.events[ev]) this.events[ev].push({e:e,fn:fn});
		else this.events[ev] = [{e:e,fn:fn}];
		return this;
	}
	// Trigger a defined event with arguments. This is for internal-use to be 
	// sure to include the correct arguments for a particular event
	Canvas.prototype.trigger = function(ev,args){
		if(typeof ev != "string") return;
		if(typeof args != "object") args = {};
		var o = [];
		if(typeof this.events[ev]=="object"){
			for(var i = 0 ; i < this.events[ev].length ; i++){
				var e = G.extend(this.events[ev][i].e,args);
				if(typeof this.events[ev][i].fn == "function") o.push(this.events[ev][i].fn.call(this,e))
			}
		}
		if(o.length > 0) return o;
	}
	Canvas.prototype.copyToClipboard = function(){
		var x = Math.min(this.wide,this.ctx.canvas.clientWidth)*this.scale;
		var y = Math.min(this.tall,this.ctx.canvas.clientHeight)*this.scale;
		this.log('copyToClipboard',x,y,this);
		if(x > 0 && y > 0){
			this.clipboard = this.ctx.getImageData(0, 0, x, y);
			this.clipboardData = this.clipboard.data;
		}
		return this;
	}
	Canvas.prototype.pasteFromClipboard = function(){
		if(this.clipboardData){
			this.clipboard.data = this.clipboardData;
			this.ctx.putImageData(this.clipboard, 0, 0);
		}
		return this;
	}
	// Will toggle the <canvas> as a full screen element if the browser supports it.
	Canvas.prototype.toggleFullScreen = function(){
		this.log('toggleFullScreen',this.fullscreen)
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
	}

	// A function to be called whenever the <canvas> needs to be resized.
	//   .resize();
	//   .resize(400,250)
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
	}
	// Internal function to update the internal variables defining the width and height.
	Canvas.prototype.setWH = function(w,h,ctx){
		this.log('setWH',w,h)
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
	}

	// Now we define the Graph class
	// mygraph = new Graph(stuQuery reference, {data:series,color: "#9944ff",type:"symbol",format:{width:4}}, options);
	// where:
	//   id (HTMLelement) is the HTML element to attach the canvas to
	//   series (array) contains the data series e.g. series = [[x,y],[x2,y2],[x3,y3],...[xn,yn]] or an array of data series;
	//   options (object) contains any customisation options for the graph as a whole e.g. options = { xaxis:{ label:'Time (HJD)' },yaxis: { label: 'Delta (mag)' }};
	//     type: symbol, rect, line, area
	function Graph(element, data, options){

		if(!options) options = {};
		if(typeof options.logging==="boolean") this.logging = options.logging;
		if(typeof options.logtime==="boolean") this.logtime = options.logtime;

		// Define some variables
		this.version = "0.2.5";
		this.start = new Date();
		if(typeof element!="object") return;
		this.data = {};
		this.chart = {};
		this.options = {};
		this.selecting = false;
		this.panning = false;
		this.updating = false;
		this.events = [];
		this.lines = [];
		this.metrics = {};
		this.fontscale = 1;
		this.quicktime = 75;
		this.colours = ["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f","#ff7f00","#cab2d6","#6a3d9a","#ffff99","#b15928"];
		this.offset = {'x':0,'y':0};

		this.log('init',element,typeof element,data,options);

		if(this.logging) var d = new Date();

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
			p.ctx.scale(s, s);
			return p;
		}
		// Set canvas scaling for retina-type screens
		var s = window.devicePixelRatio;
		// Set properties of the temporary canvases
		for(var p in this.paper) this.paper[p] = setWH(this.paper[p],this.canvas.wide,this.canvas.tall,s);

		// Bind events to the canvas
		var _obj = this;
		this.canvas.on("resize",function(ev){
			// Attach an event to deal with resizing the <canvas>
			if(_obj.logging) var d = new Date();
			var s = window.devicePixelRatio;
			// Resize all the temporary canvases
			for(var p in _obj.paper) _obj.paper[p] = setWH(_obj.paper[p],_obj.canvas.wide,_obj.canvas.tall,s);

			_obj.setOptions().defineAxis("x").getChartOffset().calculateData().draw(true).trigger("resize",{event:ev.event});
			this.log("Total until end of resize:" + (new Date() - d) + "ms");
		}).on("mousedown",function(ev){
			var event = ev.event.originalEvent;
			var g = _obj;	// The graph object
			if(event.which!=1) return;	// Only zoom on left click
			// Check if there is a data point at the position that the user clicked.
			var x = event.layerX;
			var y = event.layerY;
			ds = g.dataAtMousePosition(x,y);

			// No data (but the alt key is pressed) so we'll start the zoom selection
			if(g.within(x,y) && g.options.zoomable){
				g.selectfrom = [x,y];
				g.selectto = g.selectfrom;
				if(event.altKey) g.selecting = true;
				else g.panning = true;
				if(g.coordinates) g.coordinates.css({'display':'none'})
			}

			// Loop over the series that match
			for(var s = 0; s < ds.length; s++){
				d = ds[s].split(":");
				if(d && d.length == 3){
					// This is a data point so we'll trigger the clickpoint event
					t = parseInt(d[0]);
					i = parseInt(d[1]);
					d = g.data[t];
					ii = g.getPixPos(x,y);
					a = g.trigger("clickpoint",{event:event,series:t,n:i,point:d.data[i],xpix:x,ypix:ii[1],title:d.title,color:d.color});
				}
			}
			return true;
		}).on("mousemove",function(ev){
			var event = ev.event.originalEvent;
			if(!event) return;
			var g = _obj;	// The graph object
			if(g.updating) return;
			g.updating = true;
			var x = event.layerX;
			var y = event.layerY;
			// Attach hover event
			if(!g.selecting && !g.panning && !g.wheelid){
				ds = g.dataAtMousePosition(event.offsetX,event.offsetY);
				g.highlight(ds);
				for(var s = 0; s < ds.length; s++){
					d = ds[s].split(":");
					if(d && d.length == 3){
						t = d[0];
						i = d[1];
						d = g.data[t];
						ii = g.getPixPos(x,y);
						g.trigger("hoverpoint",{event:event,point:d.data[i],xpix:x,ypix:ii[1],title:d.title,color:d.color});
					}
				}
				if(g.events["mousemove"]){
					var pos = g.pixel2data(x,y);
					g.trigger("mousemove",{event:event,x:pos.x,y:pos.y});
				}
			}
			if(g.selecting || g.panning){
				if(g.within(x,y)){
					g.selectto = [x,y];
					if(g.options.zoommode == "x"){
						g.selectfrom[1] = g.getPos("y",g.y.min);
						g.selectto[1] = g.getPos("y",g.y.max);
					}
					if(g.options.zoommode == "y"){
						g.selectfrom[0] = g.getPos("x",g.x.min);
						g.selectto[0] = g.getPos("x",g.x.max);
					}
					if(g.selecting){
						g.canvas.pasteFromClipboard();
						g.canvas.ctx.beginPath();
						// Draw selection rectangle
						g.canvas.ctx.fillStyle = g.options.grid.colorZoom || 'rgba(0,0,0,0.1)';
						g.canvas.ctx.lineWidth = g.options.grid.border;
						g.canvas.ctx.fillRect(g.selectfrom[0]-0.5,g.selectfrom[1]-0.5,g.selectto[0]-g.selectfrom[0],g.selectto[1]-g.selectfrom[1]);
						g.canvas.ctx.fill();
						g.canvas.ctx.closePath();
					}
					if(g.panning) g.panBy(g.selectto[0]-g.selectfrom[0], g.selectto[1]-g.selectfrom[1],{'quick':(g.metrics.draw.av >= g.quicktime)})
				}
			}
			g.updating = false;
			return true;
		}).on("mouseleave",function(ev){
			var event = ev.event.originalEvent;
			if(event.offsetX >= _obj.options.width) event.layerX = _obj.options.width;
			if(event.offsetX <= 0) event.layerX = 0;
			if(event.offsetY >= _obj.options.height) event.layerY = _obj.options.height;
			if(event.offsetY <= 0) event.layerY = 0;
			_obj.canvas.trigger('mousemove',{event:event});
			_obj.canvas.trigger('mouseup',{event:event});
		}).on("mouseup",function(ev){
			var g = _obj;	 // The graph object
			var event = ev.event.originalEvent;
			if(g.selecting){
				var r = g.getDataRange(g.selectfrom[0],g.selectto[0],g.selectfrom[1],g.selectto[1]);

				// No difference between points - reset view
				if(r[0]==r[1] && r[2]==r[3]) g.zoom();
				else{
					if(g.options.zoommode == "x"){
						// If we are only zooming in the x-axis we don't change the y values
						r[2] = g.y.datamin;
						r[3] = g.y.datamax;
					}
					if(g.options.zoommode == "y"){
						// If we are only zooming in the y-axis we don't change the x values
						r[0] = g.x.datamin;
						r[1] = g.x.datamax;
					}
					g.zoom(r,{'update':true});
				}
				g.selecting = false;
			}
			if(g.panning){
				// Work out the new range
				var r = g.getDataRange(g.chart.left-g.offset.x, g.chart.left+g.chart.width-g.offset.x, g.chart.top-g.offset.y, g.chart.top+g.chart.height-g.offset.y);
				// Reset the offsets
				g.offset.x = 0;
				g.offset.y = 0;
				// Zoom to new range
				g.zoom(r,{});
				g.panning = false;
			}
			g.canvas.pasteFromClipboard();
			g.drawOverlay();
			g.trigger("mouseup",{event:event});
			return true;
		}).on("wheel",{options:options},function(ev){
			var oe,g,c,co,f,s;
			oe = ev.event.originalEvent;
			if(ev.data.options.scrollWheelZoom){
				oe.preventDefault();
				oe.stopPropagation();
			}
			g = _obj;
			if(g.wheelid) clearTimeout(g.wheelid);
			if(!g.updating){
				g.updating = true;
				c = {'x':oe.layerX,'y':oe.layerY};
				co = g.coordinates;
				if(co && co[0] == oe.target){ c.x += co[0].offsetLeft; c.y += co[0].offsetTop; }
				f = (ev.speed || (1 - Math.min(40,Math.abs(oe.deltaY))/250));
				s = (oe.deltaY > 0 ? 1/f : f);
				oe.update = ev.update;
				if(co) co.css({'display':''});
				g.zoom([c.x,c.y],{'quick':(g.metrics.draw.av >= g.quicktime),'scalex':(oe.layerX > g.chart.left ? s : 1),'scaley':(oe.layerY < g.chart.top+g.chart.height ? s : 1),'update':false});
				g.trigger('wheel',{event:oe});
				g.updating = false;
			}
			// Set a timeout to trigger a wheelstop event
			g.wheelid = setTimeout(function(e){ g.canvas.trigger('wheelstop',{event:e}); },100,{event:oe});
		}).on("wheelstop",{options:options},function(ev){
			var g = _obj;
			g.updating = false;
			g.calculateData().draw(true);
			g.wheelid = undefined;
			g.trigger('wheelstop',{event:ev.event});
		});

		// Extend the options with those provided by the user
		this.setOptions(options);

		// Finally, set the data and update the display
		this.updateData(data);

		this.log("Total:" + (new Date() - d) + "ms");
		return this;
	}

	Graph.prototype.toggleFullScreen = function(){
		this.canvas.toggleFullScreen();
		return this;
	}

	Graph.prototype.log = function(){
		if(this.logging){
			var args = Array.prototype.slice.call(arguments, 0);
			if(console && is(console.log,"function")) console.log('%cGraph%c ','font-weight:bold;','',args);
		}
		return this;
	}

	// Attach a handler to an event for the Graph object in a style similar to that used by jQuery
	//   .on(eventType[,eventData],handler(eventObject));
	//   .on("resize",function(e){ console.log(e); });
	//   .on("resize",{me:this},function(e){ console.log(e.data.me); });
	Graph.prototype.on = function(ev,e,fn){
		if(typeof ev!="string") return this;
		if(typeof fn=="undefined"){ fn = e; e = {}; }
		else{ e = {data:e} }
		if(typeof e!="object" || typeof fn!="function") return this;
		if(this.events[ev]) this.events[ev].push({e:e,fn:fn});
		else this.events[ev] = [{e:e,fn:fn}];
		return this;
	}
	// Trigger a defined event with arguments. This is for internal-use to be 
	// sure to include the correct arguments for a particular event
	Graph.prototype.trigger = function(ev,args){
		if(typeof ev != "string") return;
		if(typeof args != "object") args = {};
		var o = [];
		if(typeof this.events[ev]=="object"){
			for(var i = 0 ; i < this.events[ev].length ; i++){
				var e = G.extend(this.events[ev][i].e,args);
				if(typeof this.events[ev][i].fn == "function") o.push(this.events[ev][i].fn.call(this,e))
			}
		}
		if(o.length > 0) return o;
	}
	Graph.prototype.setOptions = function(options){
		options = options || {};
		if(typeof this.options!="object") this.options = {};
		// Set the width and height
		this.options.width = parseInt(getStyle(this.canvas.container[0], 'width'), 10);
		this.options.height = parseInt(getStyle(this.canvas.container[0], 'height'), 10);

		// Add user-defined options
		this.options = G.extend(this.options, options);

		// Set defaults for options that haven't already been set
		if(typeof this.options.grid!=="object") this.options.grid = {};
		if(typeof this.options.grid.show!=="boolean") this.options.grid.show = false;
		if(typeof this.options.grid.border!=="number") this.options.grid.border = 1;
		if(typeof this.options.grid.color!=="string") this.options.grid.color = "#888888";
		if(typeof this.options.labels!=="object") this.options.labels = {};
		if(typeof this.options.labels.color!=="string") this.options.labels.color = "black";
		if(typeof this.options.padding!=="number") this.options.padding = 0;
		if(typeof this.options.xaxis!=="object") this.options.xaxis = {};
		if(typeof this.options.yaxis!=="object") this.options.yaxis = {};
		if(typeof this.options.xaxis.label!=="string") this.options.xaxis.label = "";
		if(typeof this.options.yaxis.label!=="string") this.options.yaxis.label = "";
		if(typeof this.options.xaxis.fit!=="boolean") this.options.xaxis.fit = false;
		if(typeof this.options.yaxis.fit!=="boolean") this.options.yaxis.fit = false;
		if(typeof this.options.xaxis.log!=="boolean") this.options.xaxis.log = false;
		if(typeof this.options.yaxis.log!=="boolean") this.options.yaxis.log = false;
		if(typeof this.options.zoommode!=="string") this.options.zoommode = "both";
		if(typeof this.options.zoomable!=="boolean") this.options.zoomable = true;
		if(typeof this.options.xaxis.mode==="string" && this.options.xaxis.mode==="time") this.options.xaxis.isDate = true;
		return this;
	}

	// Only send one dataset at a time with this function
	// If an index is provided use it otherwise add sequentially
	// If a dataset already exists we don't over-write
	Graph.prototype.addDataset = function(data,idx){
		this.log('addDataset',idx);
		if(typeof idx!=="number"){
			if(typeof idx==="undefined"){
				// Create an idx
				for(var i = 0; i < 200; i++){
					if(typeof this.data[i]==="undefined"){
						idx = i;
						i = 100;
					}
				}
			}
		}

		if(this.data[idx]) this.log('addDataset error','refusing to overwrite existing dataset at '+idx,this.data[idx],data);
		else {
			// Parse the data
			for(var key in data.parse){
				var format = data.parse[key];
				for(var i = 0 ; i < data.data.length; i++){
				// Loop over each column in the line
					v = data.data[i][key];
					if(format!="string"){
						// "number", "boolean" or "date"
						if(format=="number"){
							v = parseFloat(v);
						}else if(format=="date"){
							// Convert to milliseconds since the epoch
							s = new Date(v.replace(/^"/,"").replace(/"$/,"")).getTime();
							// Extract anything less than milliseconds
							var m = v.match(/\.[0-9]{3}([0-9]+)/);
							// Add it back
							if(m && m.length == 2) s += parseFloat('0.'+m[1]);
							v = s;
						}else if(format=="boolean"){
							if(v=="1" || v=="true" || v=="Y") v = true;
							else if(v=="0" || v=="false" || v=="N") v = false;
							else v = null;
						}
					}
					data.data[i][key] = v;
				}
			}

			this.data[idx] = data;

			// Set the default to show the dataset
			if(typeof this.data[idx].show!=="boolean") this.data[idx].show = true;

			l = this.data[idx].data.length;
			this.data[idx].marks = new Array(l);

			if(!this.data[idx].type) this.data[idx].type = "symbol";
			if(!this.data[idx].format) this.data[idx].format = { };

			if(this.data[idx].symbol && !this.data[idx].symbol.shape) this.data[idx].symbol.shape = "circle";
			if(typeof this.data[idx].format.size!=="number") this.data[idx].format.size = 4;
			if(!this.data[idx].format.stroke) this.data[idx].format.stroke = this.colours[0];
			if(!this.data[idx].format.strokeDash) this.data[idx].format.strokeDash = [1,0];
			if(typeof this.data[idx].format.strokeWidth!=="number") this.data[idx].format.strokeWidth = 1;
			if(!this.data[idx].format.fill) this.data[idx].format.fill = this.colours[0];

			types = ['symbol','rect','lines','area','rule','text','format'];
			var i,j,t;

			for(i = 0; i < l ; i++){

				if(!this.data[idx].marks[i]) this.data[idx].marks[i] = {'props':{},'data':this.data[idx].data[i]};

				for(j = 0; j < types.length; j++){
					t = types[j];
					if(!this.data[idx].marks[i].props[t] && this.data[idx][t]) this.data[idx].marks[i].props[t] = this.data[idx][t];
				}
				// Should process all the "enter" options here
				if(this.data[idx].enter) this.data[idx].marks[i] = this.data[idx].enter.call(this,this.data[idx].marks[i],this.data[idx].encode.enter);
			}
		}

		return this;
	}
	Graph.prototype.updateData = function() {
		// Should process all the "update" options here;
		this.log('updateData',this.data)
		this.getGraphRange().getChartOffset().calculateData().draw(true);
	}
	Graph.prototype.getGraphRange = function(){
		this.x = { min: 1e32, max: -1e32, isDate: this.options.xaxis.isDate, log: this.options.xaxis.log, label:{text:this.options.xaxis.label}, fit:this.options.xaxis.fit };
		this.y = { min: 1e32, max: -1e32, log: this.options.yaxis.log, label:{text:this.options.yaxis.label}, fit:this.options.yaxis.fit };

		if(this.data.length <= 0) return this;

		var d,i,j,max;

		function calc(){
			out = arguments[0];
			out.min = Math.min(out.min);
			out.max = Math.max(out.max);
			for(var i = 1; i < arguments.length; i++){
				v = arguments[i];
				if(typeof v!=="undefined"){
					if(typeof v==="object") v = arguments[i].valueOf();
					if(arguments[i] < out.min) out.min = v;
					if(arguments[i] > out.max) out.max = v;
				}
			}
			return out;
		}

		for(i in this.data){
			max = this.data[i].marks.length

			// Only calculate range based on symbols or lines
			if(this.data[i].type=="symbol" || this.data[i].type=="line"){
				for(j = 0; j < max ; j++){
					d = this.data[i].marks[j].data;
					this.x = calc(this.x,d.x,d.x1,d.x2);
					this.y = calc(this.y,d.y,d.y1,d.y2);
				}
			}
		}
		// Keep a record of the data min/max
		this.x.datamin = this.x.min;
		this.x.datamax = this.x.max;
		this.x.datarange = this.x.max-this.x.min;
		this.y.datamin = this.y.min;
		this.y.datamax = this.y.max;
		this.y.datarange = this.y.max-this.y.min;
		this.defineAxis("x");
		this.defineAxis("y");
		return this;
	}

	// Pan the graph.
	// If attr.quick is set to true, we do a very quick draw of the data canvas rather
	// than recalculate everything as that can be slow when there is a lot of data.
	Graph.prototype.panBy = function(dx,dy,attr){
		this.offset.x = dx;
		this.offset.y = dy;
		this.logTime('panBy');
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
		}else{
			this.getChartOffset();
			this.calculateData();
			// Update the graph
			this.clear();
			// We don't need to update the lookup whilst panning
			this.draw(false);
		}
		this.logTime('panBy');
		return this;
	}

	// Zoom the graph.
	// We can zoom around a point or we can zoom to a defined region.
	// If attr.quick is set to true, we do a very quick draw of the data canvas rather
	// than recalculate everything as that can be slow when there is a lot of data.
	Graph.prototype.zoom = function(pos,attr){

		if(!attr) attr = {};
		if(attr.quick) this.logTime('zoom')
		if(!pos) pos = [];
		if(this.coordinates) this.coordinates.css({'display':'none'});
		// Zoom by a scale around a point [scale,x,y]
		var s,c,sx,sy;
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
				var x = pos[0] * (1 - nwide/this.canvas.wide);
				var y = pos[1] * (1 - ntall/this.canvas.tall);
			}
			// Find the center
			var c = this.pixel2data(pos[0],pos[1]);
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
			this.x.min = this.x.datamin;
			this.x.max = this.x.datamax;
			this.y.min = this.y.datamin;
			this.y.max = this.y.datamax;
			this.defineAxis("x");
			this.defineAxis("y");
		}

		this.getChartOffset();
		if(!attr.quick) this.calculateData();
		this.clear();
		if(attr.quick){
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
		}else{
			this.draw(typeof attr.update==="boolean" ? attr.update : true);
		}

		if(attr.quick) this.logTime('zoom')

		return this;
	}
	Graph.prototype.getDataRange = function(x1,x2,y1,y2){
		var c1 = this.pixel2data(x1,y1);
		var c2 = this.pixel2data(x2,y2);
		var xlo = (c1.x < c2.x) ? c1.x : c2.x;
		var xhi = (c1.x < c2.x) ? c2.x : c1.x;
		var ylo = (c1.y < c2.y) ? c1.y : c2.y;
		var yhi = (c1.y < c2.y) ? c2.y : c1.y;
		return [xlo,xhi,ylo,yhi];
	}
	Graph.prototype.getPos = function(t,c){
		if(!this[t]) return;
		var k,mn,mx,rn;
		k = (this[t].log) ? 'log':'';
		if(this[t].log) c = G.log10(c);
		mn = this[t][k+'min'];
		mx = this[t][k+'max'];
		rn = this[t][k+'range'];
		
		if(t=="y") return (this.offset[t]||0)+this.options.height-(this.chart.bottom + this.chart.height*((c-mn)/rn));
		else return (this.offset[t]||0)+(this[t].dir=="reverse" ? this.chart.left + this.chart.width*((mx-c)/(rn)) : this.chart.left + this.chart.width*((c-mn)/rn));
	}

	// For an input data value find the pixel locations
	Graph.prototype.getPixPos = function(x,y){ return [this.getPos("x",x),this.getPos("y",y)]; }
	
	// Are the x,y pixel coordinates in the displayed chart area?
	Graph.prototype.within = function(x,y){
		if(x > this.chart.left && y < this.chart.top+this.chart.height) return true;
		return false;
	}
	
	// Provide the pixel coordinates (x,y) and return the data-space values
	Graph.prototype.pixel2data = function(x,y){
		// x-axis
		x = this.x.min + ((x-this.chart.left)/this.chart.width)*this.x.range;
		// y-axis
		if(this.y.log) y = Math.pow(10,this.y.logmin + (1-(y-this.chart.top)/this.chart.height)*this.y.logrange);
		else y = this.y.min + (1-(y-this.chart.top)/this.chart.height)*this.y.range;
		return {x:x,y:y};
	}
	
	Graph.prototype.dataAtMousePosition = function(x,y){
		var t = "string";
		var idx = 0;
		var max = 0;
		var l,i,s;
		x = Math.round(x*this.canvas.scale);
		y = Math.round(y*this.canvas.scale);
		if(x >= 0 && y >= 0 && x < this.canvas.c.width && y < this.canvas.c.height && this.lookup[x] && this.lookup[x][y]) return this.lookup[x][y];
		else this.canvas.canvas.css({'cursor':''});
		return [];
	}

	// Find the highest layer in the stack
	function getTopLayer(l){
		var max = 0;
		var idx = 0;
		if(l && l.length > 0){
			for(var s = 0; s < l.length; s++){
				d = l[s].split(':');
				w = parseFloat(d[2]);
				if(w > max){
					max = w;
					idx = s;
				}
			}
			if(is(l[idx],"string")) return l[idx].split(':');
		}
		return;
	}

	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}

	// Convert a "#xxxxxx" colour into an "rgb(x,x,x)" or "rgba(x,x,x,x)" colour
	function hex2rgba(hex,a){
		var r = parseInt(hex.substr(1,2),16);
		var g = parseInt(hex.substr(3,2),16);
		var b = parseInt(hex.substr(5,2),16);
		return 'rgba('+r+','+g+','+b+(a ? ','+a:'')+')';
	}

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
	}

	Graph.prototype.highlight = function(ds){
		if(this.selecting) return;	// If we are panning we don't want to highlight symbols
		if(this.lookup && ds && ds.length > 0){
			// We want to put the saved version of the canvas back
			this.canvas.pasteFromClipboard();
			this.drawOverlay();
			var d,t,i,w,clipping,typ,mark,oldmark,ctx,n,s;
			ctx = this.canvas.ctx;

			// Only highlight the first 10 matches
			n = Math.min(10,ds.length);
			for(s = 0; s < n; s++){
				d = ds[s].split(":");
				t = d[0];
				i = d[1];
				w = d[2];
				clipping = false;
				typ = this.data[t].type;

				if(typ=="line" || typ=="rect" || typ=="area" || typ=="rule"){
					clipping = true;
					// Build the clip path
					ctx.save();
					ctx.beginPath();
					ctx.rect(this.chart.left,this.chart.top,this.chart.width,this.chart.height);
					ctx.clip();
				}
				if(typ=="line" || typ=="symbol" || typ=="rect" || typ=="area" || typ=="rule" || typ=="text"){
					// Clone the mark
					oldmark = clone(this.data[t].marks[i]);
					// Update the mark
					mark = (this.data[t].hover ? this.data[t].hover.call(this,this.data[t].marks[i],this.data[t].encode.hover) : this.data[t].marks[i]);
					// Set the canvas colours
					this.setCanvasStyles(ctx,mark);
					this.setCanvasStyles(this.paper.temp.ctx,mark);
				}

				if(typ=="line") this.drawLine(t,{'ctx':ctx});
				if(typ=="symbol") this.drawShape(mark,{'ctx':ctx});
				if(typ=="rect") this.drawRect(mark,{'ctx':ctx});
				if(typ=="area") this.drawArea(t,{'ctx':ctx});
				if(typ=="rule") this.drawRule(t,{'ctx':ctx});
				if(typ=="text") this.drawText(mark,{'ctx':ctx});

				if(typ=="line" || typ=="symbol" || typ=="rect" || typ=="area" || typ=="rule" || typ=="text"){
					// Put the mark object back to how it was
					this.data[t].marks[i] = clone(oldmark);
					this.setCanvasStyles(ctx,this.data[t].marks[i]);
					this.setCanvasStyles(this.paper.temp.ctx,this.data[t].marks[i]);
				}

				// Set the clipping
				if(clipping) ctx.restore();
			}
			

			d = getTopLayer(ds);

			if(d && d.length == 3){
				t = d[0];
				i = d[1];
				w = d[2];
				var data = this.data[t];

				if(!this.coordinates){
					this.canvas.canvasholder.append('<div class="graph-tooltip aas-series-'+t+' '+(this.options.tooltip && this.options.tooltip.theme ? this.options.tooltip.theme : "")+'" style="position:absolute;display:none;"></div>');
					this.coordinates = this.canvas.container.find('.graph-tooltip');
				}
				if(typeof data.css=="object") this.coordinates.css(data.css);
		
				// Build the hovertext output
				val = {
					title: (data.title) ? data.title : "", 
					xlabel: (this.x.label.text ? this.x.label.text : (this.x.isDate ? 'Time' : 'x')),
					ylabel: (this.y.label.text ? this.y.label.text : 'y'),
					data: data.data[i]
				}
				var html = removeRoundingErrors(mark.props.tooltip) || "";
				if(html){
					this.coordinates.html(html);
					var x = this.data[t].marks[i].props.x-this.coordinates.outerWidth()-1+this.canvas.c.offsetLeft;
					if(x < this.chart.padding) x = this.data[t].marks[i].props.x+1;
					var y = Math.max(0,Math.min(this.data[t].marks[i].props.y,this.canvas.tall-this.coordinates.outerHeight())); 
					this.coordinates.css({'display':'','left':Math.round(x)+'px','top':Math.round(y)+'px'});
				}else{
					this.coordinates.css({'display':'none'});
				}
				this.annotated = true;
			}
		}else{
			if(this.annotated){
				this.annotated = false;
				this.coordinates.css({'display':'none'});
				this.canvas.pasteFromClipboard();
				this.drawOverlay();
			}
		}
		return this;
	}

	// Defines this.x.max, this.x.min, this.x.inc, this.x.range
	Graph.prototype.defineAxis = function(axis,min,max){

		// Immediately return if the input seems wrong
		if(typeof axis != "string" || (axis != "x" && axis != "y")) return this;

		// Set the min/max if provided
		if(typeof max=="number") this[axis].max = max;
		if(typeof min=="number") this[axis].min = min;
		// Set the range of the data
		this[axis].range = this[axis].max - this[axis].min;
		this[axis].ticks = new Array();

		// Sort out what to do for log scales
		if(this[axis].log){
			// Adjust the low and high values for log scale
			this[axis].logmax = G.log10(this[axis].max);
			this[axis].logmin = (this[axis].min <= 0) ? this[axis].logmax-2 : G.log10(this[axis].min);
			this[axis].logrange = this[axis].logmax-this[axis].logmin;
			this[axis].gridmin = this[axis].logmin+0;
			this[axis].gridmax = this[axis].logmax+0;
			this[axis].inc = 1;
			this[axis].range = this[axis].max-this[axis].min;
			this[axis].gridrange = this[axis].logrange+0;
			this.makeTicks(axis);
			return this;
		}
		// If we have zero range we need to expand it
		if(this[axis].range < 0){
			this[axis].inc = 0.0;
			this[axis].gridrange = 0.0;
			return this;
		}else if(this[axis].range == 0){
			this[axis].gridmin = Math.ceil(this[axis].max)-1;
			this[axis].gridmax = Math.ceil(this[axis].max);
			this[axis].min = this[axis].gridmin;
			this[axis].max = this[axis].gridmax;
			this[axis].inc = 1.0;
			this[axis].range = this[axis].max-this[axis].min;
			this[axis].gridrange = this[axis].gridmax-this[axis].gridmin;
			this.makeTicks(axis);
			return this;
		}

		var t_inc,steps,t_div,t_max,t_min,st,sp,n,i,rg,mx,mn;
		var param = {'name': 'seconds', 'div': 1, 'base': 10};
		rg = this[axis].range;
		mx = this[axis].max;
		mn = this[axis].min;
		if(!this[axis].labelopts) this[axis].labelopts = {};
		// Set the label scaling
		var scale = (axis=="x" && this[axis].labelopts.scale) ? this[axis].labelopts.scale : 1;

		// Calculate reasonable grid line spacings
		if(this[axis].isDate && scale==1){

			this[axis].showAsDate = true;

			// Dates are in milliseconds
			// Grid line spacings can range from 1 ms to 10000 years
			// Use Gregorian year length for calendar display
			// 31557600000
			steps = [{'name': 'milliseconds', 'div': 1, 'spacings':[1,2,5,10,20,50,100,200,500]},
					{'name': 'seconds','div':1000,'spacings':[1,2,5,10,15,20,30]},
					{'name': 'minutes', 'div':60000,'spacings':[1,2,5,10,15,20,30]},
					{'name': 'hours', 'div':3600000,'spacings':[1,2,4,6,12]},
					{'name': 'days', 'div':86400000,'spacings':[1,2]},
					{'name': 'weeks', 'div':7*86400000,'spacings':[1,2]},
					{'name': 'months', 'div': 30*86400000, 'spacings':[1,3,6]},
					{'name': 'years', 'div':365.2425*86400000,'spacings':[1,2,5,10,20,50,100,200,500,1000,2000,5e3,1e4,2e4,5e4,1e5,2e5,5e5,1e6]}];
			steps = (this[axis].labelopts.steps || steps);
			for(st = 0; st < steps.length ; st++){
				for(sp = 0; sp < steps[st].spacings.length; sp++){
					n = Math.ceil(this[axis].range/(steps[st].div*steps[st].spacings[sp]));
					if(n < 1) continue;
					if(!t_div || (n > 3 && n < t_div)){
						t_div = n;
						this[axis].spacing = {'name':steps[st].name,'fract':steps[st].spacings[sp]};
						t_inc = (steps[st].div*steps[st].spacings[sp]);
						this[axis].datestep = {'name':steps[st].name,'spacing':steps[st].spacings[sp]};
					}
				}
			}

			// Set the min and max values by rounding the dates
			t_min = (new Date(roundDate(mn,this[axis].datestep.name,this[axis].datestep.spacing,{'method':'floor'}))).valueOf();
			t_max = (new Date(roundDate(mx,this[axis].datestep.name,this[axis].datestep.spacing,{'method':'ceil'}))).valueOf();

		}else{
			this[axis].showAsDate = false;
			this[axis].spacing = null;

			// Scale the range before we work out the spacings
			if(scale!=1){
				mn = mn/scale;
				mx = mx/scale;
			}

			// Start off by finding the exact spacing
			dv = Math.abs(mx - mn) / (this[axis].isDate ? 3 : 5);
		
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
			for(var i = 0; i < options.length; i++){
				distance[i] = Math.abs(frac - Math.log10(options[i]));
				if(distance[i] < tmin){
					tmin = distance[i];
					imin = i;
				}
			}

			// Now determine the actual spacing
			spacing = Math.pow(10,(base))*options[imin];
			t_inc = spacing;

			// Normalise the tick mark min/max
			t_max = Math.ceil(mx/t_inc)*t_inc;
			if(t_max < mx-t_inc*0.2) t_max += t_inc;
			t_min = Math.floor(mn/t_inc)*t_inc;
			if(t_min > mn+t_inc*0.2) t_min -= t_inc;
			
			// Determine the number of decimal places to show
			// Quicker to do it here than in makeTicks.
			this[axis].precisionlabel = Math.ceil(Math.abs(Math.log10(t_inc)));
			if(this[axis].precisionlabel==0 && Math.abs(t_min) > 10) this[axis].precisionlabel = Math.floor(Math.log10(Math.abs(t_min)));

			// If we are dealing with dates we set the precision that way
			if(this[axis].isDate){
				p = Math.log10(t_inc);
				this[axis].precisionlabeldp = (p < 0) ? Math.ceil(Math.abs(Math.log10(t_inc))) : 0;
				this[axis].precisionlabel = Math.ceil(Math.abs(Math.log10(t_max)-Math.log10(t_inc)));
			}

			// Now scale the range back
			if(scale!=1){
				t_min = t_min*scale;
				t_max = t_max*scale;
				t_inc = t_inc*scale;
				// Fix precision errors introduced by the multiplication
				t_inc = parseFloat(t_inc.toPrecision(this[axis].precisionlabel));
			}

			// Round to nearest t_inc (because of precision issues)
			t_min = Math.round(t_min/t_inc)*t_inc;
			t_max = Math.round(t_max/t_inc)*t_inc;
		}

		// Set the first/last gridline values as well as the spacing
		this[axis].gridmin = t_min;
		this[axis].gridmax = t_max;
		this[axis].inc = t_inc;
		this[axis].gridrange = this[axis].gridmax-this[axis].gridmin;
		this[axis].precision = this[axis].precisionlabel+Math.floor(Math.log10(Math.abs(scale)));

		this.makeTicks(axis);

		return this;
	}

	Graph.prototype.makeTicks = function(a){
		// Get the min/max tick marks
		var mn = this[a].gridmin;
		var mx = this[a].gridmax;
		if(this[a].log){
			mn = Math.floor(mn);
			mx = Math.ceil(mx);
		}
		if(isNaN(mn) || isNaN(mx)) return this;
		this[a].ticks = new Array();
		// Because of precision issues we can't rely on exact equality.
		for(var v = mn; v < mx+this[a].inc*0.2; v += this[a].inc){
			if(this[a].showAsDate) this[a].ticks.push({'value':(roundDate(v,this[a].datestep.name,this[a].datestep.spacing)).valueOf(),'label':''});
			else this[a].ticks.push({'value':v,'label':''});
		}

		if(this[a].ticks.length == 0){
			console.log('no ticks')
			return this;
		}
		mn = this[a].ticks[0].value;
		mx = this[a].ticks[this[a].ticks.length-1].value;
		
		// A function to format the date nicely
		function niceDate(d,sp){
		
			var hr,mn,sc,dy,mo,yr,n,f,fs;
			fs = "";
			(removeRoundingErrors(d)+"").replace(/\.([0-9]+)/,function(m,p1){ fs = p1; });
			d = new Date((typeof d==="string" ? parseInt(d):d));
			f = sp.fract
			hr = zeroFill(d.getUTCHours(),2);
			mn = zeroFill(d.getUTCMinutes(),2);
			sc = removeRoundingErrors(zeroFill(d.getUTCSeconds()+d.getUTCMilliseconds()/1000,2));
			dy = zeroFill(d.getUTCDate(),2);
			mo = zeroFill(d.getUTCMonth()+1,2);
			yr = d.getUTCFullYear();
			n = sp.name;
			if(n=="milliseconds") return sc+""+fs;
			else if(n=="seconds") return (f >= 1 ? hr+":"+mn+":"+sc : ""+sc+""+fs);
			else if(n=="minutes") return hr+":"+mn+(d.getUTCSeconds()==0 ? "" : ":"+sc);
			else if(n=="hours") return hr+":"+mn;
			else if(n=="days") return (f >= 1 ? yr+"-"+mo+"-"+dy : yr+"-"+mo+"-"+dy+' '+hr+':'+mn);
			else if(n=="weeks") return yr+"-"+mo+"-"+dy;//+(hr=="00" ? '' : ' '+Math.round((d.getUTCHours()+(d.getUTCMinutes()/60)))+'h');
			else if(n=="months") return yr+"-"+mo;
			else if(n=="years") return (f >= 1 ? ''+(d.getUTCFullYear()+Math.round((d.getUTCMonth()+1)/12)) : (Math.round(d.getUTCMonth()+1)==12 ? (d.getUTCFullYear()+1)+"-01-01" : d.getUTCFullYear()+'-'+mo+'-01'));
			else return hr+':'+mn+':'+sc;
		}

		var l,sci,base,main,precision,v,fmt,ts;

		// Calculate the number of decimal places for the increment
		this.sci_hi = 10000;
		this.sci_lo = 1e-4;
		l = Math.max(Math.abs(mx),Math.abs(mn));
		sci = (l > this.sci_hi || l < this.sci_lo);
		// Check if the data range is within our scientific bounds
		if(mx-mn < this.sci_hi && mx-mn > this.sci_lo) sci = false;
		// Get the number of decimal places to show
		precision = this[a].precision;
		function shortestFormat(fmt){
			var l = 1e100;
			var i = "";
			for(var f in fmt){
				try { fmt[f] = fmt[f].replace(/\.0+((e[\+\-0-9]+)?)$/,function(m,p1){ return p1; }).replace(/^([^\.]+[\.][^1-9]*)0+$/,function(m,p1){return p1;}).toLocaleString(); }
				catch(err){ console.log('ERROR',fmt[f],err); }
				if(typeof fmt[f]!=="string" || fmt[f] == "NaN") fmt[f] = "";
				if(fmt[f].length < l){
					l = fmt[f].length;
					i = f;
				}
			}
			return fmt[i];
		}
		
		if(this[a].log){
			// Format labels for log scale
			for(i = 0; i < this[a].ticks.length; i++){
				v = Math.pow(10,this[a].ticks[i].value);
				sci = (Math.abs(v) > this.sci_hi || Math.abs(v) < this.sci_lo);
				fmt = {};
				if(sci){
					precision = (""+v).length;
					fmt['normal'] = ""+v;
					fmt['exp'] = tidy(v.toExponential(precision));
				}else{
					precision = Math.abs(this[a].ticks[i].value);
					if(this[a].inc > 1) fmt['round'] = ""+Math.round(v);
					else fmt['fixed'] = (Math.abs(v/this[a].range) < 1e-12) ? "0" : v.toFixed(precision);
				}

				// Set the label to whichever is shortest
				this[a].ticks[i].label = shortestFormat(fmt);
			}
		}else{
			// Format labels for linear scale
			for(i = 0; i < this[a].ticks.length; i++){
				v = this[a].ticks[i].value;
				if(this[a].showAsDate){
					d = (this[a].spacing && this[a].spacing.name=="seconds" && this[a].spacing.fract < 1e-3) ? (v/1000).toFixed(precision+3) : niceDate(v,this[a].spacing);
					this[a].ticks[i].label = d;
				}else{
					fmt = {};
					precision = this[a].precision;
					// Find the differential precision
					if(v > this.sci_hi || v < this.sci_lo) precision = Math.floor(Math.log10(Math.abs(v))) - Math.floor(Math.log10(Math.abs(this[a].inc)));
					if(this[a].isDate) precision = 1;
					if(precision < 1) precision = this[a].precisionlabel;
					if(sci){
						if(this[a].isDate) fmt['date'] = ""+v;
						else fmt['exp'] = v.toExponential(precision);
					}else{
						if(this[a].inc > 1) fmt['round'] = ""+Math.round(v);
						else fmt['fixed'] = v.toFixed(precision);
					}

					// Bug fix for Javascript rounding issues when the range is big
					if(Math.abs(v/this[a].range) < 1e-12) fmt['fixed'] = "0";

					// Set the label to whichever is shortest
					this[a].ticks[i].label = shortestFormat(fmt);
				}
			}
		}
		if(!this[a].showAsDate){
			for(i = 0; i < this[a].ticks.length; i++){
				// Because of precision issues, use the label to rebuild the value
				this[a].ticks[i].calcval = this[a].ticks[i].value+0;
				this[a].ticks[i].value = parseFloat(this[a].ticks[i].label);
			}
		}
		for(i = 0; i < this[a].ticks.length; i++){
			if(this[a].labelopts && typeof this[a].labelopts.formatLabel==="function"){
				var str = '';
				var o = this[a].labelopts.formatLabel.call(this,this[a].ticks[i].value,{'axis':a,'dp':this[a].precisionlabeldp});
				if(o){
					str = tidy(o.truncated || o.str);
					prev = o;
				}
				this[a].ticks[i].label = str;
			}
		}
		// Final tidy
		for(i = 0; i < this[a].ticks.length; i++) this[a].ticks[i].label = tidy(this[a].ticks[i].label);

		// Fix precision issues
		if(this[a].log){
			this[a].gridmin = G.log10(this[a].ticks[0].value);
			this[a].gridmax = G.log10(this[a].ticks[this[a].ticks.length-1].value);
		}else{
			this[a].gridmin = this[a].ticks[0].value;
			this[a].gridmax = this[a].ticks[this[a].ticks.length-1].value;
		}
		this[a].gridrange = this[a].gridmax - this[a].gridmin;

		return this;
	}

	// A factor to scale the overall font size then redraw the graph
	Graph.prototype.scaleFont = function(s){
		if(s == 0) this.fontscale = 1;
		else this.fontscale *= (s>0 ? 1.1 : 1/1.1);
		this.getChartOffset().calculateData().draw(true);
		return this;
	}
	
	Graph.prototype.getFontHeight = function(a,t){
		var fs = this.chart.fontsize;
		if(this.options[a+'axis'] && this.options[a+'axis'][t+'FontSize']) fs = this.options[a+'axis'][t+'FontSize'];
		return fs*this.fontscale;
	}

	Graph.prototype.getChartOffset = function(){
		if(typeof this.chart!="object") this.chart = {};
		var fs,ff,o,c,cc,ts,t,a,ax,offx,dp;
		fs = getStyle(this.canvas.container[0], 'font-size');
		ff = getStyle(this.canvas.container[0], 'font-family');
		o = this.options;
		c = this.chart;
		if(!c.left) c.left = 0;
		var current = clone(c.left);
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
				dp = (o[a].tickSize||4) + 3
				c[ax[a]] += dp;
				if(a=="xaxis") offx += dp;
			}
			c[ax[a]] = Math.round(c[ax[a]]);
		}
		c.width = this.canvas.wide-c.right-c.left;
		c.height = this.canvas.tall-c.bottom-c.top;

		this.chart = c;
		return this;
	}
	
	Graph.prototype.getLabelWidth = function(){
		// If we aren't showing labels the width is 0
		var ok = (typeof this.options.yaxis.labels==="boolean") ? this.options.yaxis.labels : (this.options.labels && this.options.labels.show ? this.options.labels.show : false);
		if(!ok) return 0;

		var fs,mn,mx,ctx,maxw,i;

		// Set font for labels
		fs = this.getFontHeight('y','label');
		var mn,mx,maxw,maxdp,maxi,maxe;
		maxw = 0;
		maxdp = 0;
		maxi = 0;
		maxe = 0;
		ctx = this.canvas.ctx;
		ctx.font = fs+'px '+this.chart.fontfamily;

		mn = this.y.gridmin;
		mx = this.y.gridmax;
		if(this.y.log){
			mn = Math.ceil(this.y.gridmin);
			mx = Math.floor(this.y.gridmax);
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
	}

	// Draw the axes and grid lines for the graph
	Graph.prototype.drawAxes = function(){
		var grid,tw,c,ctx,rot,axes,r,i,j,k,a,o,d,s,p,mn,mx;
		c = this.chart;
		ctx = this.canvas.ctx;
		rot = Math.PI/2;
		axes = {'xaxis':{},'yaxis':{}};
		r = {
			'xmin': this.chart.left,
			'xmax': this.chart.left+this.chart.width,
			'ymax': this.chart.top+this.chart.height,
			'ymin': this.chart.top
		}
		var orient = {
			'left': {'rot':rot,'x1': r.xmin,'x2': r.xmax,'textAlign': 'end','textBaseline': 'middle'},
			'right': {'rot':-rot,'x1': r.xmin,'x2': r.xmax,'textBaseline': 'middle'},
			'bottom': {'textBaseline': 'top','y1': r.ymax,'y2': r.ymin}
		};

		if(!this.subgrid) this.subgrid = [2,3,4,5,6,7,8,9];

		ctx.beginPath();
		ctx.font = this.chart.fontsize+'px '+this.chart.fontfamily;
		ctx.textBaseline = 'middle';

		// Draw main rectangle
		ctx.strokeStyle = (this.options.grid.color || 'rgb(0,0,0)');
		ctx.lineWidth = this.options.grid.border;
		ctx.setLineDash([1,0]);

		if(typeof this.options.grid.background=="string"){
			ctx.fillStyle = this.options.grid.background;
			ctx.fillRect(c.left,c.top,c.width,c.height);
		}
		ctx.closePath();
		
		for(a in axes){

			o = this.options[a].orient || "left";
			// Set axis direction
			d = "x";
			if(o=="left" || o=="right") d = "y";
			if(!this[d]) continue;

			// What do we show?
			var show = {'grid':false,'labels':true,'ticks':true,'domain':true,'ticks':true};
			for(s in show){
				if(typeof this.options[a][s]==="boolean") show[s] = this.options[a][s];
				if(this.options[s] && this.options[s].show) show[s] = this.options[s].show;
			}
			
			// Set the tick width
			tw = 0;
			if(show.ticks) tw = (this.options[a].tickSize||4);

			// Draw axis line
			if(show.domain){
				ctx.beginPath();
				ctx.strokeStyle = (this.options[a].domainColor || this.options.grid.color || 'rgb(0,0,0)');
				ctx.lineWidth = (this.options[a].domainWidth || this.options.grid.border);
				if(o=="left"){
					ctx.moveTo(c.left+0.5,c.top);
					ctx.lineTo(c.left+0.5,c.top+c.height);
				}else if(o=="bottom"){
					ctx.moveTo(c.left,c.top+c.height+0.5);
					ctx.lineTo(c.left+c.width,c.top+c.height+0.5);
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
				this.drawTextLabel(this.options[a].title, p[0], p[1]+fs/2, {ctx:ctx, axis:d, format: { fontSize:fs, fontWeight:(this.options[a].titleFontWeight || "bold"), 'font':(this.options[a].titleFont || this.chart.fontfamily)}});
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
				prec = ""+axis.inc;
				prec = prec.length-prec.indexOf('.')-1;
			}
			fshalf = Math.ceil(fs/2);
			var oldx = 0;
			var prev = {};
			
			mn = axis.gridmin;
			mx = axis.gridmax;
			if(axis.log){
				mn = Math.floor(axis.gridmin);
				mx = Math.ceil(axis.gridmax);
			}
			for(var ii = 0; ii < axis.ticks.length; ii++) {
				i = axis.ticks[ii].value;
				p = this.getPos(d,i);
				if(!p || !isFinite(p)) continue;
				// As <canvas> uses sub-pixel positioning we want to shift the placement 0.5 pixels
				p = (p-Math.round(p) > 0) ? Math.floor(p)+0.5 : Math.ceil(p)-0.5;
				if(d=="y") y1 = y2 = p;
				else if(d=="x") x1 = x2 = p;

				j = (axis.log) ? G.log10(i) : i.toFixed(prec);

				if(p >= r[d+'min'] && p < r[d+'max']){
					ctx.beginPath();
					ctx.strokeStyle = (this.options[a].gridColor || 'rgba(0,0,0,0.5)');
					ctx.fillStyle = (this.options[a].labelColor || this.options.labels.color);

					// Draw tick labels
					if(show.labels){
						if(d=="x"){
							var str = axis.ticks[ii].label;
							if(!str) str = "";
							var ds = str.split(/\n/);
							var maxw = 0;
							for(var k = 0; k < ds.length ; k++) maxw = Math.max(maxw,ctx.measureText(ds[k]).width);
							if(x1+maxw/2 <= c.left+c.width && x1 > oldx && x1-maxw/2 > 0){
								ctx.textAlign = 'center';
								ctx.fillStyle = this.options.labels.color;
								for(var k = 0; k < ds.length ; k++) ctx.fillText(removeRoundingErrors(ds[k]),x1.toFixed(1),(y1 + 3 + tw + k*fs).toFixed(1));
								oldx = x1 + (j == axis.gridmin ? maxw : maxw) + 4;	// Add on the label width with a tiny bit of padding
							}
						}else if(d=="y"){
							ctx.textAlign = 'end';
							if(j==this.y.gridmax) ctx.textBaseline = 'top';
							str = axis.ticks[ii].label;
							ctx.fillText(str,(x1 - 3 - tw),(y1).toFixed(1));
						}
					}

					ctx.stroke();
								
					// Draw grid lines
					ctx.strokeStyle = (this.options[a].gridColor || 'rgba(0,0,0,0.5)');
					if(show.grid && j >= axis.gridmin && j <= axis.gridmax){
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
					for(var j = 0; j < this.subgrid.length ; j++){
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
		return this;
	}

	// Function to calculate the x,y coordinates for each data point. 
	Graph.prototype.calculateData = function(update){
		this.log('calculateData');
		if(typeof update!=="boolean") update = true;
		
		var d,n,xpx,ypx,x,y,x2,y2,sh,i;

		if(!update) return this;
		
		for(sh in this.data){
			if(this.data[sh].show){
				for(i = 0; i < this.data[sh].marks.length ; i++){
					d = this.data[sh].marks[i];
					// Process all the series updates here
					if(this.data[sh].update) this.data[sh].marks[i] = this.data[sh].update.call(this,d,this.data[sh].encode.update);

					// Store IDs for the layer and the item
					if(!this.data[sh].marks[i].id) this.data[sh].marks[i].id = parseInt(sh)+':'+i;
					
					x = this.getPos("x",d.data.x);
					y = this.getPos("y",d.data.y);

					this.data[sh].marks[i].props.x = parseFloat(x.toFixed(1));
					this.data[sh].marks[i].props.y = parseFloat(y.toFixed(1));

					// Add properties for rule lines
					if(this.data[sh].type=="rule"){
						if(!d.data.x2) d.data.x2 = d.data.x;
						if(!d.data.y2) d.data.y2 = d.data.y;
					}

					if(d.data.x2){
						this.data[sh].marks[i].props.x2 = this.getPos("x",d.data.x2);
						this.data[sh].marks[i].props.x1 = x;
						this.data[sh].marks[i].props.x = x + (this.data[sh].marks[i].props.x2-x)/2;
					}
					if(d.data.y2){
						this.data[sh].marks[i].props.y2 = this.getPos("y",d.data.y2);
						this.data[sh].marks[i].props.y1 = y;
						this.data[sh].marks[i].props.y = y + (this.data[sh].marks[i].props.y2-y)/2;
					}
				}
			}
		}
		return this;
	}

	// Polyfill
	if(!Array.prototype.fill) {
		Object.defineProperty(Array.prototype, 'fill', {
			value: function(value) {

				// Steps 1-2.
				if (this == null) {
					throw new TypeError('this is null or not defined');
				}
				var O,len,k,end;
				O = Object(this);

				// Steps 3-5.
				len = O.length >>> 0;

				// Steps 6-7.
				var start = arguments[1];
				var relativeStart = start >> 0;

				// Step 8.
				k = relativeStart < 0 ?
					Math.max(len + relativeStart, 0) :
					Math.min(relativeStart, len);

				// Steps 9-10.
				end = arguments[2];
				var relativeEnd = end === undefined ?
					len : end >> 0;

				// Step 11.
				var final = relativeEnd < 0 ?
					Math.max(len + relativeEnd, 0) :
					Math.min(relativeEnd, len);

				// Step 12.
				while (k < final) {
					O[k] = value;
					k++;
				}

				// Step 13.
				return O;
			}
		});
	}

	// Draw the data onto the graph
	Graph.prototype.drawData = function(updateLookup){
		var lo,hi,x,y,ii,l,p,s,sh,o,ctx;
		var twopi = Math.PI*2;

		// Define an empty pixel-based lookup table
		if(updateLookup) this.lookup = Array(this.canvas.c.width).fill().map(x => Array(this.canvas.c.height));
		// Clear the data canvas
		this.clear(this.paper.data.ctx);
		this.paper.data.scale = {'x':1,'y':1};
		ctx = this.canvas.ctx;

		// Build the clip path
		ctx.save();
		ctx.beginPath();
		ctx.rect(this.chart.left,this.chart.top,this.chart.width,this.chart.height);
		ctx.clip();

		for(sh in this.data){
			if(this.data[sh].show){

				this.setCanvasStyles(this.paper.data.ctx,this.data[sh].marks[0]);
				this.setCanvasStyles(this.paper.temp.ctx,this.data[sh].marks[0]);

				// Draw lines
				if(this.data[sh].type=="line") this.drawLine(sh,{'update':true});
				if(this.data[sh].type=="rule") this.drawRule(sh,{'update':true});
				if(this.data[sh].type=="area") this.drawArea(sh,{'update':true});
				if(this.data[sh].type=="symbol" || this.data[sh].type=="rect" || this.data[sh].type=="text"){
					for(i = 0; i < this.data[sh].marks.length ; i++){
						m = this.data[sh].marks[i];
						p = m.props;

						if(p.x && p.y){
							if(this.data[sh].type=="symbol") this.drawShape(this.data[sh].marks[i],{'update':(updateLookup && this.data[sh].hover)});
							if(this.data[sh].type=="rect") this.drawRect(this.data[sh].marks[i],{'update':(updateLookup && this.data[sh].hover)});
							if(this.data[sh].type=="text") this.drawText(this.data[sh].marks[i],{'update':(updateLookup && this.data[sh].hover)});
						}
					}
				}
			}
		}
		// Draw the data canvas to the main canvas
		try { this.canvas.ctx.drawImage(this.paper.data.c,0,0,this.paper.data.width,this.paper.data.height); }catch(e){ }
		
		// Apply the clipping
		ctx.restore();

		return this;
	}

	Graph.prototype.remove = function(){
		this.canvas.canvasholder.remove();
		return {};
	}

	Graph.prototype.drawRect = function(datum,attr){
		var x1,y1,x2,y2,dx,dy,o,ctx,n;
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

			ctx.beginPath();
			ctx.rect(x1,y1,dx,dy);
			ctx.fill();
			ctx.closePath();
			o = {id:datum.id,xa:Math.floor(x1-dx/2),xb:Math.ceil(x1+dx/2),ya:Math.floor(y2),yb:Math.ceil(y1),w:1};
			if(attr.update) this.addRectToLookup(o);
			return o;
		}
		return "";
	}

	Graph.prototype.drawRule = function(sh,attr){
		if(!attr) attr = {};
		var ctx,i;
		ctx = (attr.ctx || this.paper.data.ctx);
		this.clear(this.paper.temp.ctx);
		this.paper.temp.ctx.beginPath();
		for(i = 0; i < this.data[sh].marks.length ; i++){
			p = this.data[sh].marks[i].props;
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

		if(attr.update) this.addTempToLookup({'id':this.data[sh].marks[0].id, 'weight':0.6});
		return this;
	}
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
	}
	Graph.prototype.drawLine = function(sh,attr){
		var ctx,ps,oldp,i;
		ctx = (attr.ctx || this.paper.data.ctx);
		this.clear(this.paper.temp.ctx);
		this.paper.temp.ctx.beginPath();
		ps = this.data[sh].marks;
		oldp = ps[0].props;
		for(i = 1; i < ps.length ; i++){
			p = ps[i].props;
			if(!isNaN(oldp.x) && !isNaN(p.x)) this.drawVisibleLineSegment(oldp.x,oldp.y,p.x,p.y);
			oldp = p;
		}
		this.paper.temp.ctx.stroke();
		ctx.drawImage(this.paper.temp.c,0,0,this.paper.temp.width,this.paper.temp.height);

		if(attr.update) this.addTempToLookup({'id':this.data[sh].marks[0].id, 'weight':0.6});

		return this;
	}
	
	Graph.prototype.drawArea = function(sh,attr){
		var ctx,oldp,areas,a,i,j,k;
		ctx = (attr.ctx || this.paper.data.ctx);
		this.clear(this.paper.temp.ctx);
		this.paper.temp.ctx.beginPath();
		oldp = {};
		areas = new Array();
		// We need to loop across the data first splitting into segments
		for(i = 0, a = 0; i < this.data[sh].marks.length ; i++){
			p = this.data[sh].marks[i].props;
			y1 = (p.y1 || p.y);
			y2 = p.y2;
			if(p.x && y1 && y2){
				if(!areas[a]) areas[a] = new Array();
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
					p = this.data[sh].marks[areas[a][j]].props;
					poly[a][k] = [p.x,p.y2];
				}
				// Move along bottom of area backwards
				for(j = areas[a].length-1; j >= 0; j--,k++){
					p = this.data[sh].marks[areas[a][j]].props;
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
		if(this.data[sh].marks[0].props.format.strokeWidth > 0) this.paper.temp.ctx.stroke();
		
		ctx.drawImage(this.paper.temp.c,0,0,this.paper.temp.width,this.paper.temp.height);

		if(attr.update) this.addTempToLookup({'id':this.data[sh].marks[0].id, 'weight':0.4});

		return this;
	}

	// Draw text
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
	}

	Graph.prototype.drawTextLabel = function(txt,x,y,attr){
		if(!attr) attr = {};
		var str,w,b,l,bits,f,fs,s,ctx;

		ctx = (attr.ctx||this.canvas.ctx);
		f = (attr.format || {});
		if(!f.font) f.font = this.chart.fontfamily;
		if(!f.fontSize) f.fontSize = this.chart.fontsize*this.fontscale;
		if(!f.fontWeight) f.fontWeight = "bold";
		if(!f.align) f.align = "center";
		if(!f.baseline) f.baseline = "middle";

		// Deal with superscript
		if(!txt) txt = "";
		str = 'NORMAL:'+txt.replace(/([\^\_])\{([^\}]*)\}/g,function(m,p1,p2){ var t = (p1=="^" ? 'SUP':'SUB');return '%%'+t+':'+p2+'%%NORMAL:'; })
		bits = str.split(/%%/);
		w = 0;
		// Calculate the width of the text
		for(b = 0; b < bits.length; b++){
			bits[b] = bits[b].split(":");
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
		if(f.baseline == "top") ;
		// We've taken control of the positioning
		ctx.textAlign = "left";

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
	}

	// Draw a shape
	// Override the datum.x and datum.y with attr.x,attr.y if provided
	// Draw to attr.ctx if provided; otherwise to this.paper.data.ctx
	Graph.prototype.drawShape = function(datum,attr){
		if(!attr.ctx) attr.ctx = this.paper.data.ctx;
		var ctx,p,x1,y1,s,w,h,x1,y1,o;
		ctx = attr.ctx;
		p = datum.props;
		
		x1 = attr.x || p.x;
		y1 = attr.y || p.y;
		
		ctx.moveTo(x1,y1);
		ctx.beginPath();

		var shape = p.symbol.shape;

		w = s = h = (Math.sqrt(p.format.size) || 4);

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
			else{ x1 = p.x - w/2; }

			if(p.y2) h = p.y2-p.y1;
			else if(p.height && p.y){ h = p.height; y1 = p.y - p.height/2; }
			else if(p.height && p.yc){ h = p.height; y1 = p.yc - p.height/2; }
			else{ y1 = p.y - h/2; }

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
	}

	// Use the temporary canvas to build the lookup (make sure you've cleared it before writing to it)
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
	}


	// We'll use a bounding box to define the lookup area
	Graph.prototype.addRectToLookup = function(i){
		if(!i.id) return;
		var x,y,value,p,a;
		p = 1;
		a = i.id+':'+(i.weight||1);
		if(i.xb < i.xa){ var t = i.xa; i.xa = i.xb; i.xb = t; }
		if(i.yb < i.ya){ var t = i.ya; i.ya = i.yb; i.yb = t; }

		for(var dir in {'x':'','y':''}){
			for(var bit in {'a':'','b':''}){
				i[dir+''+bit] *= this.canvas.scale;
				i[dir+''+bit] = (bit == "a") ? Math.floor(i[dir+''+bit]) : Math.ceil(i[dir+''+bit]);
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
				if(!this.lookup[x][y]) this.lookup[x][y] = [a];
				else this.lookup[x][y].push(a);
			}
		}
		return this;
	}

	// Clear the canvas
	Graph.prototype.clear = function(ctx){
		w = ctx ? ctx.canvas.width : this.canvas.wide;
		h = ctx ? ctx.canvas.height : this.canvas.tall;
		(ctx || this.canvas.ctx).clearRect(0,0,w,h);
		return this;
	}

	// Draw everything
	Graph.prototype.draw = function(updateLookup){
		this.logTime('draw');
		this.clear();
		this.drawAxes();
		this.drawData(updateLookup);
		if(updateLookup) this.canvas.copyToClipboard();
		this.drawOverlay();
		this.logTime('draw');
		return this;
	}

	Graph.prototype.drawOverlay = function(){
		// Potentially draw things afterwards
		
		return this;
	}

	Graph.prototype.logTime = function(key){

		if(!this.metrics[key]) this.metrics[key] = {'times':[],'start':''};
		if(!this.metrics[key].start) this.metrics[key].start = new Date();
		else{
			var t,w,v,tot,l,i;
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
			if(this.logtime) console.log('%cGraph%c: '+key+' '+t+'ms ('+this.metrics[key].av.toFixed(1)+'ms av)','font-weight:bold;','');
			delete this.metrics[key].start;
		}
		return this;
	}

	function tidy(v){
		if(typeof v!=="string") return "";
		if(v=="0") return v;
		return v.replace(/\.0+e/,"e").replace(/\.0{6}[0-9]+e/,"e").replace(/([0-9]+)\.9{6}[0-9]+e/,function(m,p1){ val = parseFloat(p1); return (val+(val < 0 ? -1 : 1))+"e"; }).replace(/(\.[1-9]+)0+e/,function(m,p1){ return p1+"e"; }).replace(/\.0$/,"").replace(/\.([0-9]+?)0+$/g,function(m,p1){ return "."+p1; });
	}

	function removeRoundingErrors(e){
		return (e) ? e.toString().replace(/(\.[0-9]+[1-9])[0]{6,}[1-9]*/,function(m,p1){ return p1; }).replace(/(\.[0-9]+[0-8])[9]{6,}[0-8]*/,function(m,p1){ var l = (p1.length-1); return parseFloat(p1).toFixed(l); }).replace(/^0+([0-9]+\.)/g,function(m,p1){ return p1; }) : "";
	}
	
	function buildFont(f){ return f.fontWeight+" "+f.fontSize+"px "+f.font; }
	
	function roundDate(ms,t,n,attr){
		var d,df,l,a,a2,time,f,months;
		if(!attr) attr = {};
		if(!attr.method) attr.method = "round";
		time = new Date(ms);
		d = { 'dow': time.getUTCDay(), 'h': time.getUTCHours(), 'm': time.getUTCMinutes(), 's': (time.getUTCSeconds()+time.getUTCMilliseconds()/1000), 'ms': time.getUTCMilliseconds(), 'dd': time.getUTCDate(), 'mm': time.getUTCMonth(), 'yy': time.getUTCFullYear() };
		if(!n || n < 1) n = 1;
		df = 0;
		ly = false;
		if(d.yy%4==0) ly = true;
		if(d.yy%100==0) ly = false;
		if(d.yy%400==0) ly = true;
		months = [31,(ly ? 29 : 28),31,30,31,30,31,31,30,31,30,31];
		// Round to nearest block
		if(t == "years"){
			a = d.yy + (d.mm + (d.dd + (d.h+((d.m+(d.s/60))/60))/24)/months[d.mm])/12;
			a2 = Math[attr.method].call([],a/n)*n;
			// There is no year zero
			if(a2 == 0) a2 = 1;
			d2 = new Date(zeroFill(a2,4)+'-01-01');
			df = d2-time;
		}else if(t == "months"){
			a = d.mm + d.dd/months[d.mm];
			a2 = (Math[attr.method].call([],a/n)*n + 1);
			if(a2 > 12){
				d.yy += Math.floor(a2/12);
				a2 = a2%12;
			}
			d2 = new Date(d.yy+'-'+zeroFill(a2,2)+'-01');
			df = d2-time;
		}else if(t == "weeks"){
			a = (d.dow + (d.h+((d.m+(d.s/60))/60))/24);
			a2 = Math[attr.method].call([],a/(n*7))*(n*7);
			f = 86400000;
			df = Math.round((a2-a)*f);
		}else{
			f = 1;
			if(t == "milliseconds"){ a = d.s*1000; f = 1; }
			else if(t == "seconds"){ a = d.s; f = 1000; }
			else if(t == "minutes"){ a = d.m + d.s/60; f = 60000; }
			else if(t == "hours"){ a = d.h + (d.m+(d.s/60))/60; f = 3600000; }
			else if(t == "days"){ a = d.dd + (d.h+((d.m+(d.s/60))/60))/24; f = 86400000; }
			else{ a = d.s*1000; f = 1; }
			a2 = Math[attr.method].call([],a/n)*n;
			df = Math.round((a2-a)*f);
		}
		if(df != 0) time = new Date(time.valueOf() + df);
		return time;
	}
	root.Graph = Graph;

})(window || this);
