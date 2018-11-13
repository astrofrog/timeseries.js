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
			this.setWH(this.wide,this.tall);
			this.ctx = this.c.getContext('2d');
			this.ctx.clearRect(0,0,this.wide,this.tall);
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
		this.canvas.on("dblclick", {me:this}, function(e){ e.data.me.trigger("dblclick",{event:e}); });
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
			if(console && is(console.log,"function")) console.log('Canvas',args);
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
		var x = Math.min(this.wide,this.ctx.canvas.clientWidth);
		var y = Math.min(this.tall,this.ctx.canvas.clientHeight);
		this.log('copyToClipboard',x,y,this)
		if(x > 0 && y > 0){
			this.clipboard = this.ctx.getImageData(0, 0, x, y);
			this.clipboardData = this.clipboard.data;
		}
		return this
	}
	Canvas.prototype.pasteFromClipboard = function(){
		this.clipboard.data = this.clipboardData;
		this.ctx.putImageData(this.clipboard, 0, 0);
	}
	// Will toggle the <canvas> as a full screen element if the browser supports it.
	Canvas.prototype.toggleFullScreen = function(){
		this.log('toggleFullScreen',this.fullscreen)
		this.elem = this.container[0];
		
		if(this.fullscreen){
			if(document.exitFullscreen) document.exitFullscreen();
			else if(document.mozCancelFullScreen) document.mozCancelFullScreen();
			else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
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
			
			if(this.fullwindow){
				this.canvas.css({'width':0,'height':0});
				w = window.outerWidth;
				h = window.outerHeight;
				S(document).css({'width':w+'px','height':h+'px'});
			}else{
				// We have to zap the width of the canvas to let it take the width of the container
				this.canvas.css({'width':0,'height':0});
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
		c.width = w;
		c.height = h;
		this.wide = w;
		this.tall = h;
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
	Graph = function(element, data, options){

		if(!options) options = {};
		if(options.logging) this.logging = true;

		// Define some variables
		this.version = "0.2.5";
		this.start = new Date();
		if(typeof element!="object") return;
		this.data = {};
		this.chart = {};
		this.options = {};
		this.selecting = false;
		this.panning = false;
		this.events = [];
		this.lines = [];
		this.fontscale = 1;
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
		
		this.temp = document.createElement('canvas');
		this.temp.width = this.canvas.wide;
		this.temp.height = this.canvas.tall;
		this.tempctx = this.temp.getContext('2d');


		// Bind events to the canvas
		this.canvas.on("resize",{me:this},function(ev){
			// Attach an event to deal with resizing the <canvas>
			if(ev.data.me.logging) var d = new Date();

			ev.data.me.temp.width = ev.data.me.canvas.wide;
			ev.data.me.temp.height = ev.data.me.canvas.tall;
			ev.data.me.tempctx = ev.data.me.temp.getContext('2d');

			ev.data.me.setOptions().defineAxis("x").calculateData().draw(true).trigger("resize",{event:ev.event});
			this.log("Total until end of resize:" + (new Date() - d) + "ms");
		}).on("mousedown",{me:this},function(ev){
			var event = ev.event.originalEvent;
			var g = ev.data.me;	// The graph object
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
				d = ds[s].id.split(":");
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
		}).on("mousemove",{me:this},function(ev){
			var event = ev.event.originalEvent;
			if(!event) return;
			var g = ev.data.me;	// The graph object
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
						g.selectfrom[1] = g.getYPos(g.y.min);
						g.selectto[1] = g.getYPos(g.y.max);
					}
					if(g.options.zoommode == "y"){
						g.selectfrom[0] = g.getXPos(g.x.min);
						g.selectto[0] = g.getXPos(g.x.max);
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
					if(g.panning) g.panBy(g.selectto[0]-g.selectfrom[0], g.selectto[1]-g.selectfrom[1])
				}
			}
			g.updating = false;
			return true;
		}).on("mouseleave",{me:this},function(ev){
			var event = ev.event.originalEvent;
			if(event.offsetX >= ev.data.me.options.width) event.layerX = ev.data.me.options.width;
			if(event.offsetX <= 0) event.layerX = 0;
			if(event.offsetY >= ev.data.me.options.height) event.layerY = ev.data.me.options.height;
			if(event.offsetY <= 0) event.layerY = 0;
			ev.data.me.canvas.trigger('mousemove',{event:event});
			ev.data.me.canvas.trigger('mouseup',{event:event});
		}).on("mouseup",{me:this},function(ev){
			var g = ev.data.me;	 // The graph object
			var event = ev.event.originalEvent;
			function getDataRange(x1,x2,y1,y2){
				var c1 = g.pixel2data(x1,y1);
				var c2 = g.pixel2data(x2,y2);
				var xlo = (c1.x < c2.x) ? c1.x : c2.x;
				var xhi = (c1.x < c2.x) ? c2.x : c1.x;
				var ylo = (c1.y < c2.y) ? c1.y : c2.y;
				var yhi = (c1.y < c2.y) ? c2.y : c1.y;
				return [xlo,xhi,ylo,yhi];
			}
			if(g.selecting){
				var r = getDataRange(g.selectfrom[0],g.selectto[0],g.selectfrom[1],g.selectto[1]);

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
				var r = getDataRange(g.chart.left-g.offset.x, g.chart.left+g.chart.width-g.offset.x, g.chart.top-g.offset.y, g.chart.top+g.chart.height-g.offset.y);
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
		}).on("wheel",{me:this,options:options},function(ev){
			var oe = ev.event.originalEvent;
			if(ev.data.options.scrollWheelZoom){
				oe.preventDefault();
				oe.stopPropagation();
			}
			var me = ev.data.me;
			if(me.wheelid) clearTimeout(me.wheelid);
			if(!me.updating){
				me.updating = true;
				var c = {'x':oe.layerX,'y':oe.layerY};
				var co = me.coordinates;
				if(co && co[0] == oe.target){ c.x += co[0].offsetLeft; c.y += co[0].offsetTop; }
				var f = (ev.speed || 0.9);
				oe.update = ev.update;
				if(co) co.css({'display':''});
				me.zoom([c.x,c.y],{scale:(oe.deltaY > 0 ? 1/f : f),'update':false});
				me.trigger('wheel',{event:oe});
				me.updating = false;
			}
			// Set a timeout to trigger a wheelstop event
			me.wheelid = setTimeout(function(e){ e.data.me.canvas.trigger('wheelstop',{event:e}); },250,{event:oe,data:ev.data});
		}).on("wheelstop",{me:this,options:options},function(ev){
			ev.data.me.draw(true);
			ev.data.me.wheelid = undefined;
			ev.data.me.trigger('wheelstop',{event:ev.event});
		}).on("dblclick",{me:this},function(ev){
			var g = ev.data.me;	 // The graph object
			if(ev.event){
				var event = ev.event.originalEvent;
				g.toggleFullScreen();
				// Bind events
				g.canvas.trigger('dblclick',{event:event});
			}
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
		this.calculateData().draw(true);
		return this;
	}

	Graph.prototype.log = function(){
		if(this.logging){
			var args = Array.prototype.slice.call(arguments, 0);
			if(console && is(console.log,"function")) console.log('Graph',args);
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
		if(typeof this.options.labels.color!=="string") this.options.label.color = "black";
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

			if(!this.data[idx].symbol.shape) this.data[idx].symbol.shape = "circle";
			if(typeof this.data[idx].format.size!=="number") this.data[idx].format.size = 4;
			if(!this.data[idx].format.stroke) this.data[idx].format.stroke = this.colours[0];
			if(!this.data[idx].format.strokeDash) this.data[idx].format.strokeDash = [1,0];
			if(typeof this.data[idx].format.strokeWidth!=="number") this.data[idx].format.strokeWidth = 1;
			if(!this.data[idx].format.fill) this.data[idx].format.fill = this.colours[0];

			for(var i = 0; i < l ; i++){

				if(!this.data[idx].marks[i]) this.data[idx].marks[i] = {'props':{},'data':this.data[idx].data[i]};

				// Copy the general symbol to the datapoint.
				if(!this.data[idx].marks[i].props.symbol) this.data[idx].marks[i].props.symbol = this.data[idx].symbol;
				if(!this.data[idx].marks[i].props.rect) this.data[idx].marks[i].props.rect = this.data[idx].rect;
				if(!this.data[idx].marks[i].props.lines) this.data[idx].marks[i].props.lines = this.data[idx].lines;
				if(!this.data[idx].marks[i].props.area) this.data[idx].marks[i].props.area = this.data[idx].area;
				if(!this.data[idx].marks[i].props.format) this.data[idx].marks[i].props.format = this.data[idx].format;

				// Should process all the "enter" options here
				if(this.data[idx].enter) this.data[idx].marks[i] = this.data[idx].enter.call(this,this.data[idx].marks[i],this.data[idx].encode.enter);
			}
		}

		return this;
	}
	Graph.prototype.updateData = function() {
		// Should process all the "update" options here;
		this.log('updateData',this.data)
		this.getGraphRange().calculateData().draw(true);
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

	Graph.prototype.panBy = function(dx,dy){
		this.offset.x = dx;
		this.offset.y = dy;
		this.calculateData();
		// Update the graph
		this.clear();
		// We don't need to update the lookup whilst panning
		this.draw(false);
		return this;
	}

	Graph.prototype.zoom = function(pos,attr){

		if(!attr) attr = {};
		if(!pos) pos = [];
		if(this.coordinates) this.coordinates.css({'display':'none'});
		// Zoom by a scale around a point [scale,x,y]
		if(pos.length == 2){
			var s = (attr.scale || 0.8);
			// Find the center
			var c = this.pixel2data(pos[0],pos[1]);
			// Calculate the new zoom range
			pos = [c.x - s*(c.x-this.x.min), c.x + s*(this.x.max-c.x), c.y - s*(c.y-this.y.min), c.y + s*(this.y.max-c.y)];
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
		if(pos.length == 0){
			this.x.min = this.x.datamin;
			this.x.max = this.x.datamax;
			this.y.min = this.y.datamin;
			this.y.max = this.y.datamax;
			this.defineAxis("x");
			this.defineAxis("y");
		}
		this.calculateData();
		// Update the graph
		this.clear();
		this.draw(typeof attr.update==="boolean" ? attr.update : true);
		return this;
	}

	Graph.prototype.getPos = function(t,c){
		if(!this[t]) return;
		if(this[t].log){
			c = G.log10(c);
			var min = this[t].gmin;
			var max = this[t].gmax;
			var ran = this[t].grange;
		}else{
			var min = this[t].min;
			var max = this[t].max;
			var ran = this[t].range;
		}
		if(t=="y") return (this.offset[t]||0)+this.options.height-(this.chart.bottom + this.chart.height*((c-min)/ran));
		else return (this.offset[t]||0)+(this[t].dir=="reverse" ? this.chart.left + this.chart.width*((max-c)/(ran)) : this.chart.left + this.chart.width*((c-min)/ran));
	
	}
	// For an input data value find the y-pixel location
	Graph.prototype.getYPos = function(y){ return this.getPos("y",y); }
	
	// For an input data value find the x-pixel location
	Graph.prototype.getXPos = function(x){ return this.getPos("x",x); }
	
	// For an input data value find the pixel locations
	Graph.prototype.getPixPos = function(x,y){ return [this.getXPos(x),this.getYPos(y)]; }
	
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
		if(this.y.log) y = Math.pow(10,this.y.gmin + (1-(y-this.chart.top)/this.chart.height)*this.y.grange);
		else y = this.y.min + (1-(y-this.chart.top)/this.chart.height)*this.y.range;
		return {x:x,y:y};
	}
	
	Graph.prototype.dataAtMousePosition = function(x,y){
		var t = "string";
		var idx = 0;
		var max = 0;
		var l,i,s;
		if(x >= 0 && y >= 0 && x < this.canvas.wide && y < this.canvas.tall && this.lookup[x][y]) return this.lookup[x][y];
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
		return this;
	}

	Graph.prototype.highlight = function(ds){
		if(this.selecting) return;	// If we are panning we don't want to highlight symbols
		if(this.lookup && ds){
			// We want to put the saved version of the canvas back
			this.canvas.pasteFromClipboard();
			this.drawOverlay();
			var t,i,clipping;
			var ctx = this.canvas.ctx;

			for(var s = 0; s < ds.length; s++){
				d = ds[s].split(":");
				t = d[0];
				i = d[1];
				w = d[2];
				clipping = false;
				var typ = this.data[t].type;

				if(typ=="line" || typ=="rect" || typ=="area"){
					clipping = true;
					// Build the clip path
					ctx.save();
					ctx.beginPath();
					ctx.rect(this.chart.left,this.chart.top,this.chart.width,this.chart.height);
					ctx.clip();
				}
				if(typ=="line" || typ=="symbol" || typ=="rect" || typ=="area"){
					// Clone the mark
					var oldmark = clone(this.data[t].marks[i]);
					// Update the mark
					mark = (this.data[t].hover ? this.data[t].hover.call(this,this.data[t].marks[i],this.data[t].encode.hover) : this.data[t].marks[i]);
					// Set the canvas colours
					this.setCanvasStyles(ctx,mark);
					this.setCanvasStyles(this.tempctx,mark);
				}

				if(typ=="line") this.drawLine(t);
				if(typ=="symbol") this.drawShape(mark);
				if(typ=="rect") this.drawRect(mark);
				if(typ=="area") this.drawArea(t);

				if(typ=="line" || typ=="symbol" || typ=="rect" || typ=="area"){
					// Put the mark object back to how it was
					this.data[t].marks[i] = clone(oldmark);
					this.setCanvasStyles(ctx,this.data[t].marks[i]);
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

		// Sort out what to do for log scales
		if(this[axis].log){
			// Adjust the low and high values for log scale
			this[axis].gmax = G.log10(this[axis].max);//Math.ceil(G.log10(this[axis].max));
			this[axis].gmin = (this[axis].min <= 0) ? this[axis].gmax-2 : G.log10(this[axis].min);//Math.floor(G.log10(this[axis].min));

			this[axis].inc = 1;
			this[axis].range = this[axis].max-this[axis].min;
			this[axis].grange = this[axis].gmax-this[axis].gmin;
			return this;
		}

		// If we have zero range we need to expand it
		if(this[axis].range < 0){
			this[axis].inc = 0.0;
			this[axis].grange = 0.0;
			return this;
		}else if(this[axis].range == 0){
			this[axis].gmin = Math.ceil(this[axis].max)-1;
			this[axis].gmax = Math.ceil(this[axis].max);
			this[axis].min = this[axis].gmin;
			this[axis].max = this[axis].gmax;
			this[axis].inc = 1.0;
			this[axis].range = this[axis].max-this[axis].min;
			this[axis].grange = this[axis].gmax-this[axis].gmin;
			return this;
		}

		var t_inc,steps,t_div,t_max,t_min,st,sp,n,i,rg,mx,mn;
		var param = {'name': 'seconds', 'div': 1, 'base': 10};
		rg = this[axis].range;
		mx = this[axis].max;
		mn = this[axis].min;
		
		// Calculate reasonable grid line spacings
		if(this[axis].isDate){
			if(!this.options.formatLabelX) this.options.formatLabelX = {};
			// Dates are in milliseconds
			// Grid line spacings can range from 1 ms to 10000 years
			steps = [{'name': 'seconds','div':1000,'spacings':[0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.25,0.5,1,2,5,10,15]},
					{'name': 'minutes', 'div':60000,'spacings':[0.5,1,2,5,10,15,20,30]},
					{'name': 'hours', 'div':3600000,'spacings':[0.5,1,2,4,6]},
					{'name': 'days', 'div':86400000,'spacings':[0.5,1,2,7]},
					{'name': 'weeks', 'div':7*86400000,'spacings':[1,2,4,8]},
					{'name': 'years', 'div':31557600000,'spacings':[0.25,0.5,1,2,5,10,20,50,100,200,500,1000,2000,5000]}];
			steps = (this.options.formatLabelX.steps || steps);

			for(st = 0; st < steps.length ; st++){
				for(sp = 0; sp < steps[st].spacings.length; sp++){
					n = Math.ceil(this[axis].range/(steps[st].div*steps[st].spacings[sp]));
					if(n < 1) continue;
					if(!t_div || (n > 3 && n < t_div)){
						t_div = n;
						this[axis].spacing = {'name':steps[st].name,'fract':steps[st].spacings[sp]};
						t_inc = (steps[st].div*steps[st].spacings[sp]);
					}
				}
			}
		}else t_inc = Math.pow(param.base,Math.floor(Math.log(rg)/Math.log(param.base)));

		//t_inc = Math.pow(10,Math.ceil(G.log10(this[axis].range/10)));
		t_max = (Math.floor(mx/t_inc))*t_inc;
		if(t_max < mx) t_max += t_inc;
		t_min = t_max;
		i = 0;
		do {
			i++;
			t_min -= t_inc;
		}while(t_min > mn);

		// Test for really tiny values that might mess up the calculation
		if(Math.abs(t_min) < 1E-15) t_min = 0.0;
	
		// Add more tick marks if we only have a few
		while(i < (this[axis].isDate ? 3 : 5)) {
			t_inc /= 2.0;
			if((t_min + t_inc) <= mn) t_min += t_inc;
			if((t_max - t_inc) >= mx) t_max -= t_inc ;
			i = i*2;
		}
		// Set the first/last gridline values as well as the spacing
		this[axis].gmin = t_min;
		this[axis].gmax = t_max;
		this[axis].inc = t_inc;
		this[axis].grange = this[axis].gmax-this[axis].gmin;

		return this;
	}
	
	// A factor to scale the overall font size then redraw the graph
	Graph.prototype.scaleFont = function(s){
		if(s == 0) this.fontscale = 1;
		else this.fontscale *= (s>0 ? 1.1 : 1/1.1);
		this.calculateData().draw(false);
		return this;
	}
	
	Graph.prototype.getFontHeight = function(a,t){
		var fs = this.chart.fontsize;
		if(this.options[a+'axis'] && this.options[a+'axis'][t+'FontSize']) fs = this.options[a+'axis'][t+'FontSize'];
		return fs*this.fontscale;
	}

	Graph.prototype.getChartOffset = function(){
		if(typeof this.chart!="object") this.chart = {}
		var fs = getStyle(this.canvas.container[0], 'font-size');
		var ff = getStyle(this.canvas.container[0], 'font-family');
		var o = this.options;
		var c = this.chart;

		if(this.canvas.fullscreen){
			c.padding = this.canvas.wide/40;
			c.fontsize = this.canvas.wide/80;
			c.fontfamily = (typeof ff=="string") ? ff : "";
		}else{
			c.padding = 0;
			c.fontsize = (typeof fs=="string") ? parseInt(fs) : 12;
			c.fontfamily = (typeof ff=="string") ? ff : "";
		}

		// Correct for sub-pixel positioning
		b = o.grid.border*0.5;
		c.padding = o.padding || c.padding;
		c.top = c.left = c.bottom = c.right = c.padding + b;
		var ax = {'xaxis':'bottom','yaxis':'left'};
		for(var a in ax){
			if(o[a].title) this.chart[ax[a]] += this.getFontHeight(a.substr(0,1),'title')*1.5;
			if(typeof o[a].labels==="undefined") o[a].labels = true;
			if(o[a].labels) c[ax[a]] += (a=="xaxis" ? this.getFontHeight('x','label')*1.2 : this.getLabelWidth());
			if(o[a].ticks) c[ax[a]] += (o[a].tickSize||4) + 3;
			c[ax[a]] = Math.round(this.chart[ax[a]]);
		}
		c.width = this.canvas.wide-this.chart.right-c.left;
		c.height = this.canvas.tall-this.chart.bottom-c.top;

		this.chart = c;
		return this;
	}
	
	Graph.prototype.getLabelWidth = function(){
		// If we aren't showing labels the width is 0
		var ok = (typeof this.options.yaxis.labels==="boolean") ? this.options.yaxis.labels : (this.options.labels && this.options.labels.show ? this.options.labels.show : false);

		if(!ok) return 0;
		// Set font for labels
		var fs,mn,mx,ctx,maxw,prec,i;
		fs = this.getFontHeight('y','label');
		maxw = 0;
		ctx = this.canvas.ctx;
		ctx.font = fs+'px '+this.chart.fontfamily;
		// Calculate the number of decimal places for the increment - helps with rounding errors
		prec = ""+this.y.inc;
		prec = prec.length-prec.indexOf('.')-1;

		mn = this.y.gmin;
		mx = this.y.gmax;
		if(this.y.log){
			mn = Math.ceil(this.y.gmin);
			mx = Math.floor(this.y.gmax);
		}

		for(i = mn; i <= mx; i += this.y.inc){
			j = (this.y.log) ? i : i.toFixed(prec);
			maxw = Math.max(maxw,ctx.measureText((this.y.log ? Math.pow(10, j) : j.replace(/\.0+$/,""))).width);
		}
		return maxw + 4;
	}
	
	// Draw the axes and grid lines for the graph
	Graph.prototype.drawAxes = function(){
		var grid,tw,c,ctx,rot,axes,r,i,a,o,d,s,p,mn,mx;
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

		if(!this.subgrid){
			v = [2,3,4,5,6,7,8,9]
			this.subgrid = []
			for(i = 0 ; i < v.length ; i++){
				this.subgrid[i] = G.log10(v[i]);
			}
		}

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
					ctx.moveTo(c.left,c.top);
					ctx.lineTo(c.left,c.top+c.height);
				}else if(o=="bottom"){
					ctx.moveTo(c.left,c.top+c.height);
					ctx.lineTo(c.left+c.width,c.top+c.height);
				}
				ctx.stroke();
				ctx.closePath();
			}

			ctx.lineWidth = 1;

			function drawText(txt,p,attr){
				// Deal with superscript
				var str,w,b,l,bits;
				str = 'NORMAL:'+txt.replace(/([\^\_])\{([^\}]*)\}/g,function(m,p1,p2){ var t = (p1=="^" ? 'SUP':'SUB');return '%%'+t+':'+p2+'%%NORMAL:'; })
				bits = str.split(/%%/);
				w = 0;
				// Calculate the width of the text
				for(b = 0; b < bits.length; b++){
					bits[b] = bits[b].split(":");
					fs = (bits[b][0]=="NORMAL" ? 1 : 0.8)*attr.fs;
					attr.ctx.font = attr.font.replace(/%SIZE%/,fs);
					w += attr.ctx.measureText(bits[b][1]).width;
				}
				// Starting x-position
				l = p[0] - w/2;
				attr.ctx.textAlign = "left";
				for(b = 0; b < bits.length; b++){
					f = (bits[b][0]=="NORMAL" ? 1 : 0.6);
					fs = f*attr.fs;
					dy = 0;
					if(bits[b][0] == "SUP") dy = -(1-f)*attr.fs;
					if(bits[b][0] == "SUB") dy = (1-f)*attr.fs;
					attr.ctx.font = attr.font.replace(/%SIZE%/,fs);
					attr.ctx.fillText(bits[b][1],l,p[1]+dy+attr.fs/2)
					l += attr.ctx.measureText(bits[b][1]).width;s
				}
				return;
			}

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
				drawText(this.options[a].title, p,{ctx:ctx,axis:d,fs:fs,font:(this.options[a].titleFontWeight || "bold")+' %SIZE%px '+(this.options[a].titleFont || this.chart.fontfamily)});
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
			prec = ""+axis.inc;
			prec = prec.length-prec.indexOf('.')-1;
			fshalf = Math.ceil(fs/2);
			var oldx = 0;
			var prev = {};
			
			mn = axis.gmin;
			mx = axis.gmax;
			if(axis.log){
				mn = Math.floor(axis.gmin);
				mx = Math.ceil(axis.gmax);
			}
			
			for(i = mn; i <= mx; i += axis.inc) {
				p = this.getPos(d,(axis.log ? Math.pow(10, i) : i));
				if(!p || p < r[d+'min'] || p > r[d+'max']) continue;
				// As <canvas> uses sub-pixel positioning we want to shift the placement 0.5 pixels
				p = (p-Math.round(p) > 0) ? Math.floor(p)+0.5 : Math.ceil(p)-0.5;
				if(d=="y") y1 = y2 = p;
				else if(d=="x") x1 = x2 = p;

				j = (axis.log) ? i : i.toFixed(prec);

				ctx.beginPath();
				ctx.strokeStyle = (this.options[a].gridColor || 'rgba(0,0,0,0.5)');
				ctx.fillStyle = (this.options[a].labelColor || this.options.labels.color);

				// Draw tick labels
				if(show.labels){
					if(d=="x"){
						var str = "";
						if(typeof this.options.formatLabelX.fn==="function"){
							var o = this.options.formatLabelX.fn.call(this,j,prev);
							if(o){
								str = (o.truncated || o.str);
								prev = o;
							}
						}else{
							str = (axis.isDate) ? this.formatLabelDate(j) : (this.x.log ? Math.pow(10, j) : j).toLocaleString();
							prev = {'str':str};
						}
						var ds = str.split(/\n/);
						var maxw = 0;
						for(var k = 0; k < ds.length ; k++) maxw = Math.max(maxw,ctx.measureText(ds[k]).width);
						if(x1+maxw/2 <= c.left+c.width && x1 > oldx && x1-maxw/2 > 0){
							ctx.textAlign = (j == axis.gmax) ? 'end' : 'center';
							ctx.fillStyle = this.options.labels.color;
							for(var k = 0; k < ds.length ; k++) ctx.fillText(removeRoundingErrors(ds[k]),x1.toFixed(1),(y1 + 3 + tw + k*fs).toFixed(1));
							oldx = x1 + (j == axis.gmin ? maxw : maxw) + 4;	// Add on the label width with a tiny bit of padding
						}
						if(x1-maxw/2 < 0) prev = null;
					}else if(d=="y"){
						ctx.textAlign = 'end';
						if(j==this.y.gmax) ctx.textBaseline = 'top';
						ctx.fillText((this.y.log ? Math.pow(10, j) : j.replace(/\.0+$/,"")),(x1 - 3 - tw),(y1).toFixed(1));
					}
				}

				ctx.stroke();
								
				// Draw grid lines
				if(show.grid && j >= axis.gmin && j <= axis.gmax){
					ctx.beginPath();
					ctx.lineWidth = (this.options[a].gridWidth || 0.5);
					ctx.moveTo(x1,y1);
					ctx.lineTo(x2,y2);
					ctx.stroke();
				}
				
				// Draw tick marks lines
				if(show.ticks && j >= axis.gmin && j <= axis.gmax){
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
				
				// Draw sub grid for log scale
				if(show.grid && axis.log){
					ctx.beginPath();
					sub = (this.options.grid.sub) ? this.options.grid.sub : {};
					ctx.strokeStyle = (sub.color ? sub.color : 'rgba(0,0,0,0.2)');
					ctx.lineWidth = (sub.width ? sub.width : 0.5);
					for(var j = 0; j < this.subgrid.length ; j++){
						di = i+this.subgrid[j];
						if(di < axis.gmax){
							p = this.getPos(d,Math.pow(10,di));
							p = (p-Math.round(p) > 0) ? Math.floor(p)+0.5 : Math.ceil(p)-0.5;
							ctx.moveTo(p,y2);
							ctx.lineTo(p,y1);
						}
					}
					ctx.stroke();
					ctx.closePath();
				}
			}
		}
		return this;
	}

	Graph.prototype.formatLabelDate = function(d){
		d = new Date(parseInt(d));
		var hr,mn,sc,dy,mo,yr,n,f;
		f = this.x.spacing.fract;
		hr = zeroFill(d.getUTCHours(),2);
		mn = zeroFill(d.getUTCMinutes(),2);
		sc = zeroFill(d.getUTCSeconds()+d.getUTCMilliseconds()/1000,2);
		dy = zeroFill(d.getUTCDate(),2);
		mo = zeroFill(d.getUTCMonth()+1,2);
		yr = d.getUTCFullYear();
		n = this.x.spacing.name;
		if(n=="seconds") return (f >= 1 ? hr+":"+mn+":"+sc : ""+sc);
		else if(n=="minutes") return hr+":"+mn+(d.getUTCSeconds()==0 ? "" : ":"+sc);
		else if(n=="hours") return hr+":"+mn;
		else if(n=="days") return (f >= 1 ? yr+"-"+mo+"-"+dy : yr+"-"+mo+"-"+dy+' '+hr+':'+mn);
		else if(n=="weeks") return yr+"-"+mo+"-"+dy+(hr=="00" ? '' : ' '+Math.round((d.getUTCHours()+(d.getUTCMinutes()/60)))+'h');
		else if(n=="years") return (f >= 1 ? ""+(d.getUTCFullYear()+Math.round((d.getUTCMonth()+1)/12)) : (Math.round(d.getUTCMonth()+1)==12 ? (d.getUTCFullYear()+1)+"-01-01" : d.getUTCFullYear()+'-'+mo+'-01'));
		else return hr+":"+mn+":"+sc;
	}

	// Function to calculate the x,y coordinates for each data point. 
	Graph.prototype.calculateData = function(update){
		this.log('calculateData');
		this.getChartOffset();
		if(typeof update!=="boolean") update = true;
		
		var d,n,xpx,ypx,x,y,x2,y2;

		if(!update) return this;
		
		for(var sh in this.data){
			if(this.data[sh].show){
				for(var i = 0; i < this.data[sh].marks.length ; i++){
					d = this.data[sh].marks[i];

					// Process all the series updates here
					if(this.data[sh].update) this.data[sh].marks[i] = this.data[sh].update.call(this,d,this.data[sh].encode.update);

					// Store IDs for the layer and the item
					this.data[sh].marks[i].id = parseInt(sh)+':'+i;
					
					x = this.getXPos(d.data.x);
					y = this.getYPos(d.data.y);

					this.data[sh].marks[i].props.x = parseFloat(x.toFixed(1));
					this.data[sh].marks[i].props.y = parseFloat(y.toFixed(1));
					if(d.data.x2){
						this.data[sh].marks[i].props.x2 = this.getXPos(d.data.x2);
						this.data[sh].marks[i].props.x1 = x;
						this.data[sh].marks[i].props.x = x + (this.data[sh].marks[i].props.x2-x)/2;
					}
					if(d.data.y2){
						this.data[sh].marks[i].props.y2 = this.getYPos(d.data.y2);
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
		var lo,hi,x,y,ii,l,p,s,sh,o,i;
		var twopi = Math.PI*2;

		// Define an empty pixel-based lookup table
		if(updateLookup) this.lookup = Array(this.canvas.wide).fill(0).map(x => Array(this.canvas.tall));

		var ctx = this.canvas.ctx;

		// Build the clip path
		ctx.save();
		ctx.beginPath();
		ctx.rect(this.chart.left,this.chart.top,this.chart.width,this.chart.height);
		ctx.clip();

		for(sh in this.data){
			//this.logTime('draw series '+sh+' '+this.data[sh].type);
			if(this.data[sh].show){

				this.setCanvasStyles(ctx,this.data[sh].marks[0]);
				this.setCanvasStyles(this.tempctx,this.data[sh].marks[0]);

				// Draw lines
				if(this.data[sh].type=="line"){
					ctx.beginPath();
					this.drawLine(sh,updateLookup);
				}
				if(this.data[sh].type=="area"){
					ctx.beginPath();
					this.drawArea(sh,updateLookup);
				}
				if(this.data[sh].type=="symbol" || this.data[sh].type=="rect"){
					for(i = 0; i < this.data[sh].marks.length ; i++){
						m = this.data[sh].marks[i];
						p = m.props;

						// Update the canvas styles for this dataset
						// Perhaps this should actually be done for every mark individually rather than just the first
						//if(i == 0) this.setCanvasStyles(m);

						if(p.x && p.y){
							if(this.data[sh].type=="symbol"){
								if(p.x && p.y && m.data.x >= this.x.min && m.data.x <= this.x.max && m.data.y >= this.y.min && m.data.y <= this.y.max && p.y <= this.chart.top+this.chart.height){
									o = this.drawShape(this.data[sh].marks[i]);
									if(updateLookup && this.data[sh].hover) this.addRectToLookup(o);
								}
							}
							if(this.data[sh].type=="rect"){
								o = this.drawRect(this.data[sh].marks[i]);
								if(updateLookup && this.data[sh].hover) this.addRectToLookup(o);
							}
						}
					}
				}
			}
			//this.logTime('draw series '+sh+' '+this.data[sh].type);
		}
		
		// Apply the clipping
		ctx.restore();

		return this;
	}

	Graph.prototype.addLine = function(opt){
		// Should sanitize the input here
		this.lines.push(opt);
		return this;
	}

	Graph.prototype.removeLines = function(opt){
		this.lines = [];
		return this;
	}

	Graph.prototype.remove = function(){
		this.canvas.container.replaceWith(this.canvas.origcontainer);
		return {};
	}

	Graph.prototype.drawLines = function(){
		// Loop over each line
		for(var l = 0; l < this.lines.length ; l++){
			if(this.lines[l].x){
				x = (this.lines[l].x.length == 2) ? this.lines[l].x : [this.lines[l].x,this.lines[l].x];
				x1 = this.getXPos((this.x.log ? Math.pow(10,x[0]): x[0]));
				x2 = this.getXPos((this.x.log ? Math.pow(10,x[1]): x[1]));
			}else{
				x1 = this.chart.left;
				x2 = this.chart.left+this.chart.width;
			}
			if(this.lines[l].y){
				y = (this.lines[l].y.length == 2) ? this.lines[l].y : [this.lines[l].y,this.lines[l].y];
				y1 = this.getYPos((this.y.log ? Math.pow(10,y[0]): y[0]));
				y2 = this.getYPos((this.y.log ? Math.pow(10,y[1]): y[1]));
			}else{
				y1 = this.chart.top+this.chart.height;
				y2 = this.chart.top;
			}
			this.canvas.ctx.beginPath();
			this.canvas.ctx.strokeStyle = (typeof this.data[l].format.stroke=="string" ? this.data[l].format.stroke : 'black');
			this.canvas.ctx.lineWidth = (typeof this.data[l].format.strokeWidth=="number" ? this.data[l].format.strokeWidth : 1);
			this.canvas.ctx.moveTo(x1,y1);
			this.canvas.ctx.lineTo(x2,y2);
			this.canvas.ctx.stroke();
			this.canvas.ctx.closePath();
		}
		return this;
	}

	Graph.prototype.drawRect = function(datum){
		if(datum.props.x2 || datum.props.y2){
			var x1 = (datum.props.x1 || datum.props.x);
			var y1 = (datum.props.y1 || datum.props.y);
			var x2 = (datum.props.x2 || x1);
			var y2 = (datum.props.y2 || y1);
		
			var dx = (datum.props.format.width||1);
			var dy = (datum.props.format.height||1);

			this.canvas.ctx.beginPath();
			this.canvas.ctx.rect(x1-dx/2,y1,dx,(y2-y1));
			this.canvas.ctx.fill();
			this.canvas.ctx.closePath();

			return {id:datum.id,xa:Math.floor(x1-dx/2),xb:Math.ceil(x1+dx/2),ya:Math.floor(y2),yb:Math.ceil(y1),w:1};

		}
		return [];
	}

	Graph.prototype.drawLine = function(sh,updateLookup){
		this.clearTemp();
		this.tempctx.beginPath();
		var oldp = {};
		var pad = 10;
		var gaps = 0;
		for(var i = 0; i < this.data[sh].marks.length ; i++){
			p = this.data[sh].marks[i].props;
			if(p.x && p.y){
				if(i == 0){
					this.tempctx.moveTo(p.x,p.y);
				}else{
					if(gaps > 0) this.tempctx.moveTo(p.x,p.y);
					this.tempctx.lineTo(p.x,p.y);
				}
				gaps = 0;
				oldp = p;
			}else{
				gaps++;
			}
		}
		this.tempctx.stroke();
		this.canvas.ctx.drawImage(this.temp,0,0);

		if(updateLookup) this.addTempToLookup({'id':this.data[sh].marks[0].id, 'weight':0.6});

		return this;
	}
	
	Graph.prototype.drawArea = function(sh,updateLookup){
		this.clearTemp();
		this.tempctx.beginPath();
		var oldp = {};
		var a,i,j,k;
		var areas = new Array();
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
			if(areas[a].length){
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
			for(j = 0; j < poly[a].length; j++){
				if(j==0) this.tempctx.moveTo(poly[a][j][0],poly[a][j][1]);
				else this.tempctx.lineTo(poly[a][j][0],poly[a][j][1]);
			}
		}

		this.tempctx.fill();
		if(this.data[sh].marks[0].props.format.strokeWidth > 0) this.tempctx.stroke();
		
		this.canvas.ctx.drawImage(this.temp,0,0);

		if(updateLookup) this.addTempToLookup({'id':this.data[sh].marks[0].id, 'weight':0.4});

		return this;
	}

	// Draw a shape
	// Override the datum.x and datum.y with x,y if provided
	// Draw to ctx if provided; otherwise to this.canvas.ctx
	Graph.prototype.drawShape = function(datum,ctx,x,y){

		if(!ctx) ctx = this.canvas.ctx;
		p = datum.props;
		
		var x1,y1,s,w,h;

		var x1 = x || p.x;
		var y1 = y || p.y;
		
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

		return {id:datum.id,xa:Math.floor(x1-w/2),xb:Math.ceil(x1+w/2),ya:Math.floor(y1-h/2),yb:Math.ceil(y1+h/2)};
	}

	// Use the temporary canvas to build the lookup (make sure you've cleared it before writing to it)
	Graph.prototype.addTempToLookup = function(attr){
		if(!attr.id) return;
		var a = attr.id+':'+(attr.weight||1);
		var px = this.tempctx.getImageData(0,0,this.canvas.wide, this.canvas.tall);
		for(var i = 0, p = 0, x = 0, y = 0; i < px.data.length; i+=4, p++, x++){
			if(x == this.canvas.wide){
				x = 0;
				y++;
			}
			if(px.data[i] || px.data[i+1] || px.data[i+2] || px.data[i+3]){
				if(x < this.canvas.wide && y < this.canvas.tall){
					if(this.lookup[x][y] == null) this.lookup[x][y] = new Array();
					this.lookup[x][y].push(a);
				}
			}
		}
		return this;
	}


	// We'll use a bounding box to define the lookup area
	Graph.prototype.addRectToLookup = function(i){
		if(!i.id) return;
		var x,y,value;
		var p = 2;
		var a = i.id+':'+(i.weight||1);
		if(i.xb < i.xa){ var t = i.xa; i.xa = i.xb; i.xb = t; }
		if(i.yb < i.ya){ var t = i.ya; i.ya = i.yb; i.yb = t; }
		i.xb += p*2;
		i.xb = Math.min(i.xb,this.canvas.wide-1);
		i.ya -= p;
		i.yb += p;
		if(i.xa < 0) i.xa = 0;
		if(i.ya < 0) i.ya = 0;
		// Clip to chart
		i.yb = Math.min(i.yb,this.chart.top+this.chart.height);
		// Use bounding box to define the lookup area
		for(x = i.xa; x < i.xb; x++){
			for(y = i.ya; y < i.yb; y++){
				if(this.lookup[x][y] == null) this.lookup[x][y] = new Array();
				this.lookup[x][y].push(a);
			}
		}
		return this;
	}

	// Clear the canvas
	Graph.prototype.clear = function(){
		this.canvas.ctx.clearRect(0,0,this.canvas.wide,this.canvas.tall);
		// Reset lookup BLAH
		return this;
	}
	Graph.prototype.clearTemp = function(){
		this.tempctx.clearRect(0,0,this.canvas.wide,this.canvas.tall);
		return this;
	}
	
	// Draw everything
	Graph.prototype.draw = function(updateLookup){
		this.logTime('draw')
		this.clear();
		this.clearTemp();
		this.drawAxes();
		this.drawData(updateLookup);
		this.canvas.copyToClipboard();
		this.drawOverlay();
		this.logTime('draw');
		return this;
	}

	Graph.prototype.drawOverlay = function(){
		this.drawLines();
		return this;
	}

	Graph.prototype.logTime = function(key){
	
		if(!this.times) this.times = {};
		if(!this.times[key]) this.times[key] = new Date();
		else{
			console.log('Time ('+key+'): '+((new Date())-this.times[key])+'ms')
			delete this.times[key];
		}
		return this;
	}

	function removeRoundingErrors(e){
		return (e) ? e.toString().replace(/(\.[0-9]+[1-9])[0]{6,}[1-9]*/,function(m,p1){ return p1; }).replace(/(\.[0-9]+[0-8])[9]{6,}[0-8]*/,function(m,p1){ var l = (p1.length-1); return parseFloat(p1).toFixed(l); }).replace(/^0+([0-9]+\.)/g,function(m,p1){ return p1; }) : "";
	}
	
	root.Graph = Graph;

})(window || this);
