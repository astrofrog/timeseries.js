var Graph;

(function(){

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
	if(typeof document.cancelFullScreen != 'undefined') {
		fullScreenApi.supportsFullScreen = true;
	}else{
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
		fullScreenApi.requestFullScreen = function(el) {
			return (this.prefix === '') ? el.requestFullScreen() : el[this.prefix + 'RequestFullScreen']();
		}
		fullScreenApi.cancelFullScreen = function(el) {
			return (this.prefix === '') ? document.cancelFullScreen() : document[this.prefix + 'CancelFullScreen']();
		}
	}
	// jQuery plugin
	if (typeof jQuery != 'undefined') {
		jQuery.fn.requestFullScreen = function() {
			return this.each(function() {
				if (fullScreenApi.supportsFullScreen) {
					fullScreenApi.requestFullScreen(this);
				}
			});
		};
	}
	// export api
	window.fullScreenApi = fullScreenApi;
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

	// Convert a "#xxxxxx" colour into an "rgb(x,x,x)" colour
	function parseColour(c){
		if(c.indexOf('#')!=0) return c;
		//Easier to visualize bitshifts in hex
		rgb = parseInt(c.substr(1), 16);
		//Extract rgb info
		r = (rgb & (255 << 16)) >> 16;
		g = (rgb & (255 << 8)) >> 8;
		b = (rgb & 255);
		return "rgb("+r+","+g+","+b+")";
	}

	function zeroFill(number, width){
		width -= number.toString().length;
		if(width > 0) return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
		return number + ""; // always return a string
	}
	
	// Add commas every 10^3
	function addCommas(nStr) {
		nStr += '';
		var x = nStr.split('.');
		var x1 = x[0];
		var x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) x1 = x1.replace(rgx, '$1' + ',' + '$2');
		return x1 + x2;
	}

	// Get the current Julian Date
	function getJD(today) {
		// The Julian Date of the Unix Time epoch is 2440587.5
		if(!today) today = new Date();
		return ( today.getTime() / 86400000.0 ) + 2440587.5;
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
		this.fullscreen = false;
		this.fullwindow = false;
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
		window.addEventListener('resize',function(e){ _obj.resize(); });

		// If the Javascript function has been passed a width/height
		// those take precedence over the CSS-set values
		if(this.wide > 0) this.container.css({'width':this.wide+'px'});
		this.wide = this.container.width();
		if(this.tall > 0) this.container.css({'height':this.tall+'px'});
		this.tall = this.container.height();
		
		// Add a <canvas> to it
		this.container.html('<canvas class="canvas" style="display:block;font:inherit;"></canvas>');
		this.containerbg = this.container.css('background');
		this.canvas = this.container.find('canvas');
		this.canvas.css({'position':'absolute'})
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
		if(fullScreenApi.supportsFullScreen){
			// Bind the fullscreen function to the double-click event if the browser supports fullscreen
			this.canvas.on('dblclick', {me:this}, function(e){ e.data.me.toggleFullScreen(); });
		}
		this.canvas.on("mousedown",{me:this}, function(e){ e.data.me.trigger("mousedown",{event:e}); });
		this.canvas.on("mousemove",{me:this}, function(e){ e.data.me.trigger("mousemove",{event:e}); });
		this.canvas.on("mouseup",{me:this}, function(e){ e.data.me.trigger("mouseup",{event:e}); });
		this.canvas.on("mouseover",{me:this}, function(e){ e.data.me.trigger("mouseover",{event:e}); });
		this.canvas.on("mouseleave",{me:this}, function(e){ e.data.me.trigger("mouseleave",{event:e}); });
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
		if(fullScreenApi.supportsFullScreen) {
			this.elem = this.container[0];
			if(fullScreenApi.isFullScreen()){
				fullScreenApi.cancelFullScreen(this.elem);
				this.fullscreen = false;
			}else{
				fullScreenApi.requestFullScreen(this.elem);
				this.fullscreen = true;
			}
			this.log('toggleFullScreen',this.fullscreen)
		}
	}
	// A function to be called whenever the <canvas> needs to be resized.
	//   .resize();
	//   .resize(400,250)
	Canvas.prototype.resize = function(w,h){
		if(!this.canvas) return;
		if(!w || !h){
			// Reset the fullscreen toggle if necessary
			//if(this.fullscreen && !fullScreenApi.isFullScreen()) this.fullscreen = false;
			if(this.fullscreen) this.container.css({'background':'white'});
			else this.container.css({'background':this.containerbg});
			
			if(this.fullwindow){
				this.canvas.css({'width':0,'height':0});
				w = $(window).width();
				h = $(window).height();
				this.canvas.css({'width':w+'px','height':h+'px'});
				$(document).css({'width':w+'px','height':h+'px'});
			}else{
				// We have to zap the width of the canvas to let it take the width of the container
				this.canvas.css({'width':0,'height':0});
				w = this.container.outerWidth();
				h = this.container.outerHeight();
				this.canvas.css({'width':w+'px','height':h+'px'});
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
		if(this.ie && $.browser.version == 8) this.container.find('div').css({'width':w+'px','height':h+'px'});
		this.canvas.css({'width':w+'px','height':h+'px'});
	}


	// Now we define the Graph class
	// mygraph = new Graph(stuQuery reference, {data:series,color: "#9944ff",symbol:{show:false},rect{show:true},lines:{show:true},format:{width:4}}, options);
	// where:
	//   id (HTMLelement) is the HTML element to attach the canvas to
	//   series (array) contains the data series e.g. series = [[x,y],[x2,y2],[x3,y3],...[xn,yn]] or an array of data series;
	//   options (object) contains any customisation options for the graph as a whole e.g. options = { xaxis:{ label:'Time (HJD)' },yaxis: { label: 'Delta (mag)' }};
	Graph = function(element, data, options){

		if(!options) options = {};
		if(options.logging) this.logging = true;

		// Define some variables
		this.version = "0.2.2";
		this.start = new Date();
		if(typeof element!="object") return;
		this.data = {};
		this.chart = {};
		this.options = {};
		this.selecting = false;
		this.events = [];
		this.lines = [];

		this.log('init',element,typeof element,data,options);

		if(this.logging) var d = new Date();

		// Define the drawing canvas
		var opt = {};
		if(options.width) opt.width = options.width;
		if(options.height) opt.height = options.height;
		opt.logging = this.logging;
		
		this.canvas = new Canvas(element,opt);

		// Bind events to the canvas
		this.canvas.on("resize",{me:this},function(ev){
			// Attach an event to deal with resizing the <canvas>
			if(ev.data.me.logging) var d = new Date();
			ev.data.me.setOptions().calculateData().draw().trigger("resize",{event:ev.event});
			this.log("Total until end of resize:" + (new Date() - d) + "ms");
		}).on("mousedown",{me:this},function(ev){
			var event = ev.event.originalEvent;
			var g = ev.data.me;	// The graph object
			if(event.which!=1) return;	// Only zoom on left click
			// Check if there is a data point at the position that the user clicked.
			d = g.dataAtMousePosition(event.layerX,event.layerY);
			if(is(d,"undefined")){
				// No data so we'll start the zoom selection
				if(g.within(event.layerX,event.layerY) && g.options.zoomable){
					g.selectfrom = [event.layerX,event.layerY];
					g.selectto = g.selectfrom;
					g.selecting = true;
				}
				// Keep a copy of the current state of the canvas
				g.canvas.copyToClipboard();
			}else{
				// This is a data point so we'll trigger the clickpoint event
				t = parseInt(d[0]);
				i = parseInt(d[1]);
				d = g.data[t];
				ii = g.getPixPos(event.layerX,event.layerY);
				g.trigger("clickpoint",{event:event,series:t,n:i,point:d.data[i],xpix:event.layerX,ypix:ii[1],title:d.title,color:d.color});
			}
			return true;
		}).on("mousemove",{me:this},function(ev){
			var event = ev.event.originalEvent;
			if(!event) return;
			var g = ev.data.me;	// The graph object
			// Attach hover event
			if(!g.selecting){
				d = g.dataAtMousePosition(event.offsetX,event.offsetY);
				g.highlight(d);

				if(typeof d!="undefined"){
					t = d[0];
					i = d[1];
					d = g.data[t];
					ii = g.getPixPos(event.layerX,event.layerY);
					g.trigger("hoverpoint",{event:event,point:d.data[i],xpix:event.layerX,ypix:ii[1],title:d.title,color:d.color});
				}
				if(g.events["mousemove"]){
					var pos = g.pixel2data(event.layerX,event.layerY);
					g.trigger("mousemove",{event:event,x:pos.x,y:pos.y});
				}
			}else{
				if(g.within(event.layerX,event.layerY)){
					g.selectto = [event.layerX,event.layerY];
					if(g.options.zoommode == "x"){
						g.selectfrom[1] = g.getYPos(g.y.min);
						g.selectto[1] = g.getYPos(g.y.max);
					}
					if(g.options.zoommode == "y"){
						g.selectfrom[0] = g.getXPos(g.x.min);
						g.selectto[0] = g.getXPos(g.x.max);
					}
					g.canvas.pasteFromClipboard();
					// Draw selection rectangle
					g.canvas.ctx.beginPath();
					g.canvas.ctx.fillStyle = g.options.grid.colorZoom || 'rgba(0,0,0,0.1)';
					g.canvas.ctx.lineWidth = g.options.grid.border;
					g.canvas.ctx.fillRect(g.selectfrom[0]-0.5,g.selectfrom[1]-0.5,g.selectto[0]-g.selectfrom[0],g.selectto[1]-g.selectfrom[1]);
					g.canvas.ctx.fill();
					g.canvas.ctx.closePath();
				}
			}
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
			if(g.selecting){
				var c1 = g.pixel2data(g.selectfrom[0],g.selectfrom[1]);
				var c2 = g.pixel2data(g.selectto[0],g.selectto[1]);
				if(c1.x==c2.x && c1.y==c2.y){
					g.zoom();
				}else{
					xlo = (c1.x < c2.x) ? c1.x : c2.x;
					xhi = (c1.x < c2.x) ? c2.x : c1.x;
					ylo = (c1.y < c2.y) ? c1.y : c2.y;
					yhi = (c1.y < c2.y) ? c2.y : c1.y;
					if(g.options.zoommode == "x"){
						// If we are only zooming in the x-axis we don't change the y values
						ylo = g.y.datamin;
						yhi = g.y.datamax;
					}
					if(g.options.zoommode == "y"){
						// If we are only zooming in the y-axis we don't change the x values
						xlo = g.x.datamin;
						xhi = g.x.datamax;
					}
					g.zoom(xlo,xhi,ylo,yhi);
				}
			}
			g.selecting = false;
			g.canvas.pasteFromClipboard();
			g.drawOverlay();
			g.trigger("mouseup",{event:event});
			return true;
		})

		// Extend the options with those provided by the user
		this.setOptions(options);
		this.setColours();

		// Finally, set the data and update the display
		this.updateData(data);

		this.log("Total:" + (new Date() - d) + "ms");
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
		if(typeof this.options.grid.show!=="boolean") this.options.grid.show = true;
		if(typeof this.options.grid.border!=="number") this.options.grid.border = 1;
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
	Graph.prototype.addDataset = function(data,index){
		this.log('addDataset',index);
		if(typeof index!=="number"){
			if(typeof index==="undefined"){
				// Create an index
				for(var i = 0; i < 100; i++){
					if(typeof this.data[i]==="undefined"){
						index = i;
						i = 100;
					}
				}
			}
		}
		if(this.data[index]) this.log('addDataset error','refusing to overwrite existing dataset at '+index,this.data[index],data);
		else {
			this.data[index] = data;
			// Set the default to show the dataset
			if(typeof this.data[index].show!=="boolean") this.data[index].show = true;

			l = this.data[index].data.length;
			this.data[index].marks = new Array(l);

			if(!this.data[index].symbol) this.data[index].symbol = { 'show': true };
			if(!this.data[index].rect) this.data[index].rect = { 'show': true };
			if(!this.data[index].line) this.data[index].line = { 'show': true };
			if(!this.data[index].format) this.data[index].format = { };

			if(!this.data[index].symbol.shape) this.data[index].symbol.shape = "circle";
			if(!this.data[index].format.size) this.data[index].format.size = 4;
			if(!this.data[index].format.stroke) this.data[index].format.stroke = '#000000';
			if(!this.data[index].format.strokeDash) this.data[index].format.strokeDash = [1,0];
			if(!this.data[index].format.strokeWidth) this.data[index].format.strokeWidth = 1;
			if(!this.data[index].format.fill) this.data[index].format.fill = '#000000';

			for(var i = 0; i < l ; i++){

				if(!this.data[index].marks[i]) this.data[index].marks[i] = {'props':{},'data':this.data[index].data[i]};

				// Copy the general symbol to the datapoint.
				if(!this.data[index].marks[i].props.symbol) this.data[index].marks[i].props.symbol = this.data[index].symbol;
				if(!this.data[index].marks[i].props.rect) this.data[index].marks[i].props.rect = this.data[index].rect;
				if(!this.data[index].marks[i].props.lines) this.data[index].marks[i].props.lines = this.data[index].lines;
				if(!this.data[index].marks[i].props.format) this.data[index].marks[i].props.format = this.data[index].format;

				// Should process all the "enter" options here
				if(this.data[index].enter) this.data[index].marks[i] = this.data[index].enter.call(this,this.data[index].marks[i],this.data[index].encode.enter);
			}			
		}

		return this;
	}
	Graph.prototype.updateData = function() {
		// Should process all the "update" options here;
		this.log('updateData',this.data)
		this.getGraphRange();
		this.calculateData();
		this.clear();
		this.draw(true);
	}
	Graph.prototype.setColours = function(){
		this.colours = { background:'', lines:'rgb(0,0,0)', labels:'rgb(0,0,0)' };
		if(typeof this.options.grid.background=="string") this.colours.background = this.options.grid.background;
		if(typeof this.options.grid.color=="string") this.colours.lines = this.options.grid.color;
		if(typeof this.options.labels=="string") this.colours.labels = this.options.grid.color;
	}
	Graph.prototype.getGraphRange = function(){
		this.x = { min: 1e32, max: -1e32, isDate: this.options.xaxis.isDate, log: this.options.xaxis.log, label:{text:this.options.xaxis.label}, fit:this.options.xaxis.fit };
		this.y = { min: 1e32, max: -1e32, log: this.options.yaxis.log, label:{text:this.options.yaxis.label}, fit:this.options.yaxis.fit };

		if(this.data.length <= 0) return this;
		
		var d,i,max,t;
		var tests = {'x':[],'y':[]}
		
		for(i in this.data){
			max = this.data[i].marks.length

			for(j = 0; j < max ; j++){
				d = this.data[i].marks[j].data;

				if(d.x < this.x.min) this.x.min = d.x;
				if(d.x > this.x.max) this.x.max = d.x;
				if(d.y < this.y.min) this.y.min = d.y;
				if(d.y > this.y.max) this.y.max = d.y;

				if(d.x1 && d.x1 < this.x.min) this.x.min = d.x1;
				if(d.x1 && d.x1 > this.x.max) this.x.max = d.x1;
				if(d.y1 && d.y1 < this.y.min) this.y.min = d.y1;
				if(d.y1 && d.y1 > this.y.max) this.y.max = d.y1;
				if(d.x2 && d.x2 < this.x.min) this.x.min = d.x2;
				if(d.x2 && d.x2 > this.x.max) this.x.max = d.x2;
				if(d.y2 && d.y2 < this.y.min) this.y.min = d.y2;
				if(d.y2 && d.y2 > this.y.max) this.y.max = d.y2;
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

	Graph.prototype.zoom = function(x1,x2,y1,y2){
		// Immediately return if the input seems wrong
		if(typeof x1!="number" || typeof x2!="number" || typeof y1!="number" || typeof y2!="number"){
			this.x.min = this.x.datamin;
			this.x.max = this.x.datamax;
			this.y.min = this.y.datamin;
			this.y.max = this.y.datamax;
			this.defineAxis("x");
			this.defineAxis("y");		
		}else{
			// Re-define the axes
			this.defineAxis("x",x1,x2);
			this.defineAxis("y",y1,y2);
		}
		this.calculateData();
		// Update the graph
		this.clear();
		this.draw(true);
	}
	
	// For an input data value find the y-pixel location
	Graph.prototype.getYPos = function(y){
		if(this.y.log){
			y = G.log10(y);
			var min = this.y.gmin;
			var max = this.y.gmax;
			var ran = this.y.grange;
		}else{
			var min = this.y.min;
			var max = this.y.max;
			var ran = this.y.range;
		}
		return this.options.height-(this.chart.bottom + this.chart.height*((y-min)/ran));
	}
	
	// For an input data value find the x-pixel location
	Graph.prototype.getXPos = function(x){
		if(this.x.log){
			x = G.log10(x);
			var min = this.x.gmin;
			var max = this.x.gmax;
			var ran = this.x.grange;
		}else{
			var min = this.x.min;
			var max = this.x.max;
			var ran = this.x.range;
		}
		return (this.x.dir=="reverse" ? this.chart.left + this.chart.width*((max-x)/(ran)) : this.chart.left + this.chart.width*((x-min)/ran));
	}
	
	// For an input data value find the pixel locations
	Graph.prototype.getPixPos = function(x,y){
		return [this.getXPos(x),this.getYPos(y)];
	}
	
	// Are the x,y pixel coordinates in the displayed chart area?
	Graph.prototype.within = function(x,y){
		if(x > this.chart.left && y < this.chart.top+this.chart.height) return true;
		return false;
	}
	
	// Provide the pixel coordinates (x,y) and return the data-space values
	Graph.prototype.pixel2data = function(x,y){
		if(typeof this.x.min==="object") x = (this.x.min.getTime()+((x-this.chart.left)/this.chart.width)*this.x.range);
		else x = this.x.min+((x-this.chart.left)/this.chart.width)*this.x.range;
		if(typeof this.y.min==="object") y = (this.y.min.getTime()+(1-(y-this.chart.top)/this.chart.height)*this.y.range);
		else y = this.y.min+(1-(y-this.chart.top)/this.chart.height)*this.y.range;
		return {x:x,y:y};
	}
	
	Graph.prototype.dataAtMousePosition = function(x,y){
		t = "string";
		var found = "";
		// Define a search pattern moving out in pixels
		//search = [[0,0],[-1,0],[1,0],[0,-1],[0,1],[1,1],[1,-1],[-1,1],[-1,-1],[-2,0],[0,-2],[2,0],[0,2],[-1,-2],[1,-2],[2,-1],[2,1],[1,2],[-1,2],[-2,1],[-2,-1],[-2,-2],[-2,2],[2,2],[2,-2],[1,-3],[-1,3],[-3,-1],[-3,1],[-1,3],[1,3],[3,1],[3,-1],[3,-3],[-3,-3],[-3,3],[3,3]];
		search = [[0,0]]
		// search
		for(i = 0; i < search.length; i++){
			dx = x+search[i][0];
			dy = y+search[i][1];
			if(dx >= 0 && dy >= 0 && dx < this.canvas.wide && dy < this.canvas.tall && this.lookup[dx][dy] && is(this.lookup[dx][dy].id,t)){
				this.canvas.canvas.css({'cursor':'pointer'});
				return this.lookup[dx][dy].id.split(':');
			}else{
				this.canvas.canvas.css({'cursor':''});
			}
		}
	}
	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}
	function hex2rgba(hex,a){
		var r = parseInt(hex.substr(1,2),16);
		var g = parseInt(hex.substr(3,2),16);
		var b = parseInt(hex.substr(5,2),16);
		return 'rgba('+r+','+g+','+b+','+(a||1)+')';
	}
	Graph.prototype.setCanvasStyles = function(ctx,datum){
		var fill = (datum.props.format.fill ? datum.props.format.fill : '#000000');
		if(datum.props.format.fillOpacity) fill = hex2rgba(fill,datum.props.format.fillOpacity);		
		ctx.fillStyle = fill;
		ctx.strokeStyle = (datum.props.format.stroke ? datum.props.format.stroke : '#000000');
		ctx.lineWidth = (datum.props.format.strokeWidth || 0.8);
		ctx.setLineDash(datum.props.format.strokeDash ? datum.props.format.strokeDash : [1,0]);
		return this;
	}
	Graph.prototype.highlight = function(d){
		if(this.selecting) return;	// If we are dragging we don't want to highlight symbols
		if(this.lookup && d && d.length == 2){
			// We want to put the saved version of the canvas back
			this.canvas.pasteFromClipboard();
			this.drawOverlay();

			var t = d[0];
			var i = d[1];

			if(this.data[t].symbol.show){
				// Clone the mark
				var oldmark = clone(this.data[t].marks[i]);
				// Update the mark
				mark = (this.data[t].hover ? this.data[t].hover.call(this,this.data[t].marks[i],this.data[t].encode.hover) : this.data[t].marks[i]);

				// Set the canvas colours
				this.setCanvasStyles(this.canvas.ctx,mark);

				// Draw the new mark
				this.drawShape(mark);

				// Put the mark object back to how it was
				this.data[t].marks[i] = clone(oldmark);
				this.setCanvasStyles(this.canvas.ctx,this.data[t].marks[i]);
			}

			if(this.data[t].rect.show){
				// Clone the mark
				var oldmark = clone(this.data[t].marks[i]);
				// Update the mark
				mark = (this.data[t].hover ? this.data[t].hover.call(this,this.data[t].marks[i],this.data[t].encode.hover) : this.data[t].marks[i]);

				// Set the canvas colours
				this.setCanvasStyles(this.canvas.ctx,mark);

				// Draw the new mark
				this.drawRect(mark);

				// Put the mark object back to how it was
				this.data[t].marks[i] = clone(oldmark);
				this.setCanvasStyles(this.canvas.ctx,this.data[t].marks[i]);
			}

			var data = this.data[t];

			if(!this.coordinates){
				this.canvas.container.append('<div class="graph-popup" style="position:absolute;display:none;"></div>');
				this.coordinates = this.canvas.container.find('.graph-popup');
			}
			if(this.coordinates) this.coordinates.css({'display':''});
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
				var x = this.data[t].marks[i].props.x-this.coordinates.outerWidth()-1;
				if(x < this.chart.padding) x = this.data[t].marks[i].props.x+1;
				this.coordinates.css({'display':'','left':Math.round(x)+'px','top':Math.round(this.data[t].marks[i].props.y+1)+'px'});
			}else{
				this.coordinates.css({'display':'none'});
			}
			this.annotated = true;
		}else{
			if(this.annotated){
				this.annotated = false;
				this.coordinates.css({'display':'none'});
				//this.clear();
				//this.draw();
				this.canvas.pasteFromClipboard();
				this.drawOverlay();
			}
		}
	}

	// Defines this.x.max, this.x.min, this.x.inc, this.x.range
	Graph.prototype.defineAxis = function(axis,min,max){

		// Immediately return if the input seems wrong
		if(typeof axis != "string" || (axis != "x" && axis != "y")) return false;

		// Set the min/max if provided
		if(typeof max=="number") this[axis].max = max;
		else if(typeof max=="object" && typeof max.getTime==="function") this[axis].max = max.getTime();
		if(typeof min=="number") this[axis].min = min;
		else if(typeof min=="object" && typeof min.getTime==="function") this[axis].min = min.getTime();
		// Set the range of the data
		this[axis].range = this[axis].max - this[axis].min;

		// Sort out what to do for log scales
		if(this[axis].log){
			// Adjust the low and high values for log scale
			this[axis].gmax = Math.ceil(G.log10(this[axis].max));
			this[axis].gmin = (this[axis].min <= 0) ? this[axis].gmax-2 : Math.floor(G.log10(this[axis].min));

			this[axis].inc = 1;
			this[axis].range = this[axis].max-this[axis].min;
			this[axis].grange = this[axis].gmax-this[axis].gmin;
			return true;
		}

		// If we have zero range we need to expand it
		if(this[axis].range < 0){
			this[axis].inc = 0.0;
			this[axis].grange = 0.0;
			return true;
		}else if(this[axis].range == 0){
			this[axis].gmin = Math.ceil(this[axis].max)-1;
			this[axis].gmax = Math.ceil(this[axis].max);
			this[axis].min = this[axis].gmin;
			this[axis].max = this[axis].gmax;
			this[axis].inc = 1.0;
			this[axis].range = this[axis].max-this[axis].min;
			this[axis].grange = this[axis].gmax-this[axis].gmin;
			return true;
		}

		var param = {'name': 'seconds', 'div': 1, 'base': 10};
		var rg = this[axis].range;
		var mx = this[axis].max;
		var mn = this[axis].min;
		var t_inc;
		
		// Calculate reasonable grid line spacings
		if(this[axis].isDate){
			// Dates are in milliseconds
			// Grid line spacings can range from 1 ms to 10000 years
			var steps = [{'name': 'seconds','div':1000,'spacings':[0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.25,0.5,1,2,5,10,15]},
					{'name': 'minutes', 'div':60000,'spacings':[0.5,1,2,5,10,15,20,30]},
					{'name': 'hours', 'div':3600000,'spacings':[0.5,1,2,4,6]},
					{'name': 'days', 'div':86400000,'spacings':[0.5,1,2,7]},
					{'name': 'weeks', 'div':7*86400000,'spacings':[1,2,4,8]},
					{'name': 'years', 'div':31557600000,'spacings':[0.25,0.5,1,2,5,10,20,50,100,200,500,1000,2000,5000]}];
			var t_div;

			for(var st = 0; st < steps.length ; st++){
				for(var sp = 0; sp < steps[s].spacings.length; sp++){
					var n = Math.ceil(this[axis].range/(steps[st].div*steps[st].spacings[sp]));
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
		var t_max = (Math.floor(mx/t_inc))*t_inc;
		if(t_max < mx) t_max += t_inc;
		var t_min = t_max;
		var i = 0;
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

		return true;
	}

	Graph.prototype.getChartOffset = function(){
		if(typeof this.chart!="object") this.chart = {}
		var fs = getStyle(this.canvas.container[0], 'font-size');
		var ff = getStyle(this.canvas.container[0], 'font-family');

		if(this.canvas.fullscreen){
			this.chart.padding = this.canvas.wide/40;
			this.chart.fontsize = this.canvas.wide/80;
			this.chart.fontfamily = (typeof ff=="string") ? ff : "";
		}else{
			this.chart.padding = 0;
			this.chart.fontsize = (typeof fs=="string") ? parseInt(fs) : 12;
			this.chart.fontfamily = (typeof ff=="string") ? ff : "";
		}
		// Correct for sub-pixel positioning
		b = this.options.grid.border*0.5;
		this.chart.padding = this.options.padding || this.chart.padding;
		this.chart.top = this.chart.padding+b;
		this.chart.left = (this.y.label.text) ? this.chart.padding+Math.round(3.5*this.chart.fontsize)-b : this.chart.padding+Math.round(3*this.chart.fontsize)-b;
		this.chart.right = this.chart.padding+b;
		this.chart.bottom = (this.x.label.text) ? this.chart.padding+Math.round(4.5*this.chart.fontsize/2)-b : this.chart.padding+Math.round(2.5*this.chart.fontsize/2)+b;
		this.chart.width = this.canvas.wide-this.chart.right-this.chart.left;
		this.chart.height = this.canvas.tall-this.chart.bottom-this.chart.top;
		return this;
	}
	
	// Draw the axes and grid lines for the graph
	Graph.prototype.drawAxes = function(){
		grid = this.options.grid.show;
		o = this.chart;
		rot = Math.PI/2;
		
		this.canvas.ctx.beginPath();
		this.canvas.ctx.font = this.chart.fontsize+'px '+this.chart.fontfamily;
		this.canvas.ctx.textBaseline = 'middle';

		// Draw main rectangle
		this.canvas.ctx.strokeStyle = this.options.grid.color || 'rgb(0,0,0)';
		this.canvas.ctx.lineWidth = this.options.grid.border;
		if(typeof this.options.grid.background=="string"){
			this.canvas.ctx.fillStyle = this.options.grid.background;
			this.canvas.ctx.fillRect(o.left,o.top,o.width,o.height);
		}
		this.canvas.ctx.strokeRect(o.left,o.top,o.width,o.height);

		this.canvas.ctx.lineWidth = 1;
		// Draw x label
		if(this.x.label.text!=""){
			this.canvas.ctx.textAlign = "center";
			this.canvas.ctx.fillStyle = (this.options.grid.color ? this.options.grid.color : "black");
			this.canvas.ctx.fillText(this.x.label.text,o.left+o.width/2, this.options.height-Math.round(this.chart.fontsize/2)-this.chart.padding);
		}

		if(this.y.label.text!=""){
			this.canvas.ctx.textAlign = "center";
			this.canvas.ctx.fillStyle = (this.options.grid.color ? this.options.grid.color : "black");
			this.canvas.ctx.rotate(-rot);
			this.canvas.ctx.fillText(this.y.label.text,-(o.top+(o.height/2)),Math.round(this.chart.fontsize/2)+this.chart.padding);
			this.canvas.ctx.rotate(rot);
		}
		this.canvas.ctx.closePath();

		if(!this.subgrid){
			v = [2,3,4,5,6,7,8,9]
			this.subgrid = []
			for(var i = 0 ; i < v.length ; i++){
				this.subgrid[i] = G.log10(v[i]);
			}
		}

		this.canvas.ctx.lineWidth = (this.options.grid.width ? this.options.grid.width : 0.5);

		// Draw y-axis grid and labels
		this.canvas.ctx.textAlign = "end";
		x1 = this.chart.left;
		x2 = this.chart.left+this.chart.width;
		// Calculate the number of decimal places for the increment - helps with rounding errors
		prec = ""+this.y.inc;
		prec = prec.length-prec.indexOf('.')-1;
		fshalf = Math.ceil(this.chart.fontsize/2);
		for(var i = this.y.gmin; i <= this.y.gmax; i += this.y.inc) {
			y = this.getYPos((this.y.log ? Math.pow(10, i) : i));
			if(!y || y < this.chart.top || y > this.chart.top+this.chart.height) continue;
			// As <canvas> usings sub-pixel positioning we want to shift the placement 0.5 pixels
			y = (y-Math.round(y) > 0) ? Math.floor(y)+0.5 : Math.ceil(y)-0.5;
			j = (this.y.log) ? i : i.toFixed(prec);
			a = (j==this.y.gmax) ? fshalf : (j==this.y.gmin ? -fshalf : 0);
			this.canvas.ctx.beginPath();
			this.canvas.ctx.strokeStyle = (this.options.grid.color ? this.options.grid.color : 'rgba(0,0,0,0.5)');
			this.canvas.ctx.fillStyle = (this.options.grid.color ? this.options.grid.color : "black");
			this.canvas.ctx.fillText((this.y.log ? Math.pow(10, j) : j.replace(/\.0+$/,"")),x1-3,(y+a).toFixed(1));
			if(grid && i != this.y.gmin && i != this.y.gmax){
				this.canvas.ctx.moveTo(x1,y);
				this.canvas.ctx.lineTo(x2,y);
			}
			this.canvas.ctx.stroke();
			this.canvas.ctx.closePath();
			if(grid && this.y.log){
				this.canvas.ctx.beginPath();
				sub = (this.options.grid.sub) ? this.options.grid.sub : {};
				this.canvas.ctx.strokeStyle = (sub.color ? sub.color : 'rgba(0,0,0,0.2)');
				this.canvas.ctx.lineWidth = (sub.width ? sub.width : 0.5);
				for(var j = 0; j < this.subgrid.length ; j++){
					di = i+this.subgrid[j];
					if(di < this.y.gmax){
						y = this.getYPos(Math.pow(10,di))+0.5;
						// As <canvas> usings sub-pixel positioning we want to shift the placement 0.5 pixels
						y = (y-Math.round(y) > 0) ? Math.floor(y)+0.5 : Math.ceil(y)-0.5;
						this.canvas.ctx.moveTo(x1,y);
						this.canvas.ctx.lineTo(x2,y);
					}
				}
				this.canvas.ctx.stroke();
				this.canvas.ctx.closePath();
			}
		}
		this.canvas.ctx.closePath();

		// Draw x-axis grid and labels
		this.canvas.ctx.textBaseline = 'top';
		y1 = this.chart.top+this.chart.height;
		y2 = this.chart.top;
		// Calculate the number of decimal places for the increment - helps with rounding errors
		prec = ""+this.x.inc;
		prec = (prec.indexOf('.') > 0) ? prec.length-prec.indexOf('.')-1 : 0;
		for(var i = this.x.gmin; i <= this.x.gmax; i += this.x.inc) {
			x = this.getXPos((this.x.log ? Math.pow(10,i): i));
			if(!x || x < this.chart.left || x > this.chart.left+this.chart.width) continue;
			// As <canvas> usings sub-pixel positioning we want to shift the placement 0.5 pixels
			x = (x-Math.round(x) > 0) ? Math.floor(x)+0.5 : Math.ceil(x)-0.5;
			j = (this.y.log) ? i : i.toFixed(prec);
			this.canvas.ctx.beginPath();
			this.canvas.ctx.textAlign = (j==this.x.gmax) ? 'end' : (j==this.x.gmin ? 'start' : 'center');
			this.canvas.ctx.strokeStyle = (this.options.grid.color ? this.options.grid.color : 'rgba(0,0,0,0.5)');
			var str = (this.x.isDate) ? this.formatLabelDate(j) : addCommas((this.x.log ? Math.pow(10, j) : j))
			var ds = str.split(/\n/);
			this.canvas.ctx.fillStyle = (this.options.grid.color ? this.options.grid.color : "black");
			for(var d = 0; d < ds.length ; d++) this.canvas.ctx.fillText(ds[d],x.toFixed(1),(y1+3+d*this.chart.fontsize).toFixed(1));
			if(grid && j != this.x.gmin && j != this.x.gmax){
				this.canvas.ctx.moveTo(x,y1);
				this.canvas.ctx.lineTo(x,y2);
				this.canvas.ctx.stroke();
			}
			this.canvas.ctx.closePath();
			if(grid && this.x.log){
				this.canvas.ctx.beginPath();
				sub = (this.options.grid.sub) ? this.options.grid.sub : {};
				this.canvas.ctx.strokeStyle = (sub.color ? sub.color : 'rgba(0,0,0,0.2)');
				for(var j = 0; j < this.subgrid.length ; j++){
					di = i+this.subgrid[j];
					if(di < this.x.gmax){
						x = this.getXPos(Math.pow(10,di));
						// As <canvas> usings sub-pixel positioning we want to shift the placement 0.5 pixels
						x = (x-Math.round(x) > 0) ? Math.floor(x)+0.5 : Math.ceil(x)-0.5;
						this.canvas.ctx.moveTo(x,this.chart.top);
						this.canvas.ctx.lineTo(x,y1);
					}
				}
				this.canvas.ctx.stroke();
				this.canvas.ctx.closePath();
			}
		}
		return this;
	}

	Graph.prototype.formatLabelDate = function(d){
		d = new Date(parseInt(d));
		var hr = zeroFill(d.getUTCHours(),2);
		var mn = zeroFill(d.getUTCMinutes(),2);
		var sc = zeroFill(d.getUTCSeconds()+d.getUTCMilliseconds()/1000,2);
		var dy = zeroFill(d.getUTCDate(),2);
		var mo = zeroFill(d.getUTCMonth()+1,2);
		var yr = d.getUTCFullYear();
		var n = this.x.spacing.name;
		if(n=="seconds") return (this.x.spacing.fract >= 1 ? hr+":"+mn+":"+sc : ""+sc);
		else if(n=="minutes") return hr+":"+mn+(d.getUTCSeconds()==0 ? "" : ":"+sc);
		else if(n=="hours") return hr+":"+mn;
		else if(n=="days") return (this.x.spacing.fract >= 1 ? yr+"/"+mo+"/"+dy : yr+"/"+mo+"/"+dy+' '+hr+':'+mn);
		else if(n=="weeks") return yr+"/"+mo+"/"+dy+(hr=="00" ? '' : ' '+Math.round((d.getUTCHours()+(d.getUTCMinutes()/60)))+'h');
		else if(n=="years") return ((this.x.spacing.fract >= 1) ? ""+(d.getUTCFullYear()+Math.round((d.getUTCMonth()+1)/12)) : (Math.round(d.getUTCMonth()+1)==12 ? (d.getUTCFullYear()+1)+"/01/01" : d.getUTCFullYear()+'/'+mo+'/01'));
		else return hr+":"+mn+":"+sc;
	}

	// Function to calculate the x,y coordinates for each data point. 
	// It also creates a pixel-based lookup table for mouse hover events
	Graph.prototype.calculateData = function(event){
		this.log('calculateData');
		this.getChartOffset();
		
		var d,n,xpx,ypx,x,y,x2,y2;

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

	/*var cscale = 10;
	function c2id(rgba){
		var v = ((((rgba[0]*256)+rgba[1])*256)+rgba[2])/cscale;
		return (Number.isInteger(v)) ? v : -1;
	}
	function id2c(id){
		// Find the lookup ID colour for this layer
		var c = (id*cscale).toString(16);
		return '#'+(new Array(6 - c.length + 1).join('0'))+c;
	}*/
	
	// Draw the data onto the graph
	Graph.prototype.drawData = function(updateLookup){

		this.log('drawData',updateLookup)
		var lo,hi,x,y,ii,l,p,s,sh,o;
		var twopi = Math.PI*2;

		if(updateLookup){
			// Define an empty pixel-based lookup table
			this.lookup = new Array(this.canvas.wide);
			for (i=0; i < this.canvas.wide; i++) this.lookup[i] = new Array(this.canvas.tall);
		}

	
		// Build the clip path
		this.canvas.ctx.save();
		this.canvas.ctx.beginPath();
		this.canvas.ctx.rect(this.chart.left,this.chart.top,this.chart.width,this.chart.height);
		this.canvas.ctx.clip();

		for(sh in this.data){

			if(this.data[sh].show){

				this.setCanvasStyles(this.canvas.ctx,this.data[sh].marks[0]);

				// Draw lines
				if(this.data[sh].lines.show){
					this.canvas.ctx.beginPath();
					for(var i = 0; i < this.data[sh].marks.length ; i++){
						p = this.data[sh].marks[i].props;
						if(p.x && p.y){
							//if(this.data[sh].marks[i].data.x >= this.x.min && this.data[sh].marks[i].data.x <= this.x.max && this.data[sh].marks[i].data.y >= this.y.min && this.data[sh].marks[i].data.y <= this.y.max){
								if(i == 0) this.canvas.ctx.moveTo(p.x,p.y);
								else this.canvas.ctx.lineTo(p.x,p.y);
							//}else{
							//	this.canvas.ctx.moveTo(p.x,p.y);
							//}
						}
					}
					this.canvas.ctx.stroke();
					this.canvas.ctx.closePath();
				}

				if(this.data[sh].symbol.show || this.data[sh].rect.show){
					for(var i = 0; i < this.data[sh].marks.length ; i++){
						m = this.data[sh].marks[i];
						p = m.props;

						// Update the canvas styles for this dataset
						// Perhaps this should actually be done for every mark individually rather than just the first
						//if(i == 0) this.setCanvasStyles(m);

						if(p.x && p.y){
							if(this.data[sh].symbol.show){
								if(p.x && p.y && m.data.x >= this.x.min && m.data.x <= this.x.max && m.data.y >= this.y.min && m.data.y <= this.y.max && p.y <= this.chart.top+this.chart.height){
									o = this.drawShape(this.data[sh].marks[i]);
									if(updateLookup) this.addRectToLookup(o);
								}
							}
							if(this.data[sh].rect.show){
								o = this.drawRect(this.data[sh].marks[i]);
								if(updateLookup) this.addRectToLookup(o);
							}
						}
					}
				}
			}
		}
		
		// Apply the clipping
		this.canvas.ctx.restore();

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
		//this.log('drawLines')
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
	Graph.prototype.drawShape = function(datum){

		var x1 = datum.props.x;
		var y1 = datum.props.y;
		
		this.canvas.ctx.moveTo(x1,y1);
		this.canvas.ctx.beginPath();

		var shape = datum.props.symbol.shape;

		var s = (datum.props.format.size || 4);
		var w = s;
		var h = s;

		if(shape=="circle"){
			this.canvas.ctx.arc(x1,y1,(s/2 || 4),0,Math.PI*2,false);
		}else if(shape=="rect"){
			w = datum.props.format.width || s;
			h = datum.props.format.height || w;
			if(datum.props.x2) w = datum.props.x2-datum.props.x1;
			else if(datum.props.width && datum.props.x){ w = datum.props.width; x1 = datum.props.x - datum.props.width/2; }
			else if(datum.props.width && datum.props.xc){ w = datum.props.width; x1 = datum.props.xc - datum.props.width/2; }
			else{ x1 = datum.props.x - w/2; }

			if(datum.props.y2) h = datum.props.y2-datum.props.y1;
			else if(datum.props.height && datum.props.y){ h = datum.props.height; y1 = datum.props.y - datum.props.height/2; }
			else if(datum.props.height && datum.props.yc){ h = datum.props.height; y1 = datum.props.yc - datum.props.height/2; }
			else{ y1 = datum.props.y - h/2; }

			this.canvas.ctx.rect(x1,y1,w,h);
		}else if(shape=="cross"){
			dw = w/6;
			this.canvas.ctx.moveTo(x1+dw,y1+dw);
			this.canvas.ctx.lineTo(x1+dw*3,y1+dw);
			this.canvas.ctx.lineTo(x1+dw*3,y1-dw);
			this.canvas.ctx.lineTo(x1+dw,y1-dw);
			this.canvas.ctx.lineTo(x1+dw,y1-dw*3);
			this.canvas.ctx.lineTo(x1-dw,y1-dw*3);
			this.canvas.ctx.lineTo(x1-dw,y1-dw);
			this.canvas.ctx.lineTo(x1-dw*3,y1-dw);
			this.canvas.ctx.lineTo(x1-dw*3,y1+dw);
			this.canvas.ctx.lineTo(x1-dw,y1+dw);
			this.canvas.ctx.lineTo(x1-dw,y1+dw*3);
			this.canvas.ctx.lineTo(x1+dw,y1+dw*3);
		}else if(shape=="diamond"){
			w *= Math.sqrt(2)/2;
			this.canvas.ctx.moveTo(x1,y1+w);
			this.canvas.ctx.lineTo(x1+w,y1);
			this.canvas.ctx.lineTo(x1,y1-w);
			this.canvas.ctx.lineTo(x1-w,y1);
		}else if(shape=="triangle-up"){
			w /= 3;
			this.canvas.ctx.moveTo(x1,y1-w*1.5);
			this.canvas.ctx.lineTo(x1+w*2,y1+w*1.5);
			this.canvas.ctx.lineTo(x1-w*2,y1+w*1.5);
		}else if(shape=="triangle-down"){
			w /=3;
			this.canvas.ctx.moveTo(x1,y1+w*1.5);
			this.canvas.ctx.lineTo(x1+w*2,y1-w*1.5);
			this.canvas.ctx.lineTo(x1-w*2,y1-w*1.5);
		}else if(shape=="triangle-left"){
			w /= 3;
			this.canvas.ctx.moveTo(x1+w*1.5,y1+w*1.5);
			this.canvas.ctx.lineTo(x1+w*1.5,y1-w*1.5);
			this.canvas.ctx.lineTo(x1-w*1.5,y1);
		}else if(shape=="triangle-right"){
			w /= 3;
			this.canvas.ctx.moveTo(x1-w*1.5,y1+w*1.5);
			this.canvas.ctx.lineTo(x1-w*1.5,y1-w*1.5);
			this.canvas.ctx.lineTo(x1+w*1.5,y1);
		}
		this.canvas.ctx.fill();

		
		return {id:datum.id,xa:Math.floor(x1-w),xb:Math.ceil(x1+w),ya:Math.floor(y1-h),yb:Math.ceil(y1+h)};
	}
	// We'll use a bounding box to define the lookup area
	Graph.prototype.addRectToLookup = function(i){
		if(!i.weight) i.weight = 1;
		var x,y,value;
		var p = 2;
		// Use bounding box to define the lookup area
		for(x = (i.xa-p); x < (i.xb+p); x++){
			for(y = (i.ya-p); y < (i.yb+p); y++){
				value = ((x >= i.xa && x <= i.xb && y >= i.ya && y <= i.yb) ? 1 : 0.5)*i.weight;
				if(x >= 0 && x < this.lookup.length && y >= 0 && y < this.lookup[x].length){
					if(!this.lookup[x][y]) this.lookup[x][y] = {'value':0};
					if(value >= this.lookup[x][y].value) this.lookup[x][y] = { 'id': i.id, 'value': value };
				}
			}
		}
		return this;
	}

	// Clear the canvas
	Graph.prototype.clear = function(){
		this.canvas.ctx.clearRect(0,0,this.canvas.wide,this.canvas.tall);
		return this;
	}
	
	// Draw everything
	Graph.prototype.draw = function(updateLookup){
		this.clear();
		this.drawAxes();
		this.drawData(updateLookup);
		this.canvas.copyToClipboard();
		this.drawOverlay();
		return this;
	}

	Graph.prototype.drawOverlay = function(){
		this.drawLines();
		return this;
	}

	function removeRoundingErrors(e){
		return (e) ? e.toString().replace(/(\.[0-9]+[1-9])[0]{6,}[1-9]*/,function(m,p1){ return p1; }).replace(/(\.[0-9]+[0-8])[9]{6,}[0-8]*/,function(m,p1){ var l = (p1.length-1); return parseFloat(p1).toFixed(l); }).replace(/^0+([0-9]+\.)/g,function(m,p1){ return p1; }) : "";
	}

})(S);