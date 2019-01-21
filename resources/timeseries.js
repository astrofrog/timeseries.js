/*
	AAS Time Series graphing library
	Written by Stuart Lowe (Aperio Software)
	
	REQUIRES:
		stuquery.js
		graph.js
*/
(function(root){

	// Base directory for timeseries.js
	var basedir = "";

	// Main object to coordinate data loading
	function TimeSeriesMaster(){
		this.version = "0.0.9";
		this.create = function(json,opt){
			if(!opt) opt = {};
			if(typeof opt.logging!=="boolean") opt.logging = this.logging;
			return new TS(json,opt);
		};
		this.load = { 'resources': {'files':{},'callbacks':[]}, 'data': {'files':{},'callbacks':[]} };
		this.callback = "";
		this.logging = (location.search.indexOf('logging=true')>0);
		
		// Work out the file path to this code to use for further resources
		var scripts = document.getElementsByTagName('script');
		var path = scripts[scripts.length-1].src.split('?')[0];
		var idx = path.lastIndexOf("/");
		basedir = (idx >= 0) ? path.substr(0,idx+1) : "";

		var _obj = this;
		
		this.log = function(){
			if(this.logging || arguments[0]=="ERROR"){
				var args = Array.prototype.slice.call(arguments, 0);
				if(console && typeof console.log==="function"){
					if(arguments[0] == "ERROR") console.log('%cERROR%c %cTimeSeries%c: '+args[1],'color:white;background-color:#D60303;padding:2px;','','font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
					else console.log('%cTimeseries%c','font-weight:bold;','',args);
				}
			}
			return this;
		};
		if(console) console.log('%ctimeseries.js v'+this.version+'%c','font-weight:bold;font-size:1.25em;','');
		
		/* Have we loaded all the data files necessary? */
		this.filesLoaded = function(fs){
			this.log('filesLoaded',fs,this.load.data);
			var n = 0;
			for(var d = 0; d < fs.length; d++){
				if(this.load.data.files[fs[d]] && this.load.data.files[fs[d]].loaded) n++;
			}
			return (n==fs.length);
		};

		this.loadFromDataFile = function(f,attr,fn){
		
			this.log('loadFromDataFile',f,attr,fn);
			
			attr.file = f;
			
			if(!this.load.data.files[f]){
				this.load.data.files[f] = {'loaded':false,'callbacks':[]};
				this.load.data.files[f].callbacks.push({'fn':fn,'attr':attr});

				this.log('loading data',f);
				// Now grab the data
				S().ajax(f,{
					"dataType": "text",
					"this": this,
					"file": f,
					"success": function(d,attr){
						// Remove extra newlines at the end
						d = d.replace(/[\n\r]$/,"");

						var cb = this.load.data.files[attr.file].callbacks;
						this.log('CALLBACKS',attr.file,cb);
						for(var i = 0; i < cb.length; i++){
							// Set original context dataset data
							this.load.data.files[cb[i].attr.file].data = d;
							this.load.data.files[cb[i].attr.file].loaded = true;

							if(typeof cb[i].fn==="function") cb[i].fn.call(cb[i].attr['this'],this.load.data.files[cb[i].attr.file].data,cb[i].attr);
						}
					},
					"error": function(err,attr){
						var cb = this.load.data.files[attr.file].callbacks;
						// Throw an error for each callback
						for(var i = 0; i < cb.length; i++) cb[i].attr.this.error('Failed to load',attr.file,err);
					}
				});
			}else{
				if(!this.load.data.files[f].loaded){
					// Add the callback to the queue
					this.load.data.files[f].callbacks.push({'fn':fn,'attr':attr});
				}else{
					// Apply the callback if we've already loaded the data file
					if(typeof fn==="function") fn.call(attr['this'],this.load.data.files[f].data,attr);
				}
			}
		};

		this.loadResources = function(files,attr,callback){

			this.log('loadResources',files);

			// Load any necessary extra js/css for clustering
			if(typeof files==="string") files = [files];
			
			// Store the callback for when we've loaded everything
			this.load.resources.callbacks.push({'callback':callback,'attr':attr});

			function checkAndGo(fs,t){
				var got = 0;
				for(var f = 0; f < fs.length; f++){
					if(TimeSeries.load[t].files[fs[f]].loaded) got++;
				}
				_obj.log('checkAndGo',got,fs.length,TimeSeries.load[t].callbacks);
				if(got==fs.length){
					for(var c = TimeSeries.load[t].callbacks.length-1; c >= 0; c--){
						_obj.log('Processing callback '+c+' for '+t,TimeSeries.load[t].callbacks);
						TimeSeries.load[t].callbacks[c].callback.call((TimeSeries.load[t].callbacks[c].attr['this'] || TimeSeries),{'data':TimeSeries.load[t].callbacks[c].attr});
						// Remove the callback
						TimeSeries.load[t].callbacks.pop();
					}
				}
			}

			for(var i = 0; i < files.length; i++){
				if(!_obj.load.resources.files[files[i]]){
					_obj.log('loading resource',files[i]);

					_obj.log('start loading '+files[i]+' is ',_obj.load.resources.files[files[i]]);
					_obj.load.resources.files[files[i]] = {'loaded':false};

					_obj.loadCode(files[i],function(e){
						_obj.load.resources.files[e.url].loaded = true;
						_obj.log('loaded resource '+e.url);
						checkAndGo(files,"resources");
					});
				}else{
					_obj.log('current state of '+files[i]+' is ',_obj.load.resources.files[files[i]]);
				}
			}

			return _obj;
		};

		this.loadCode = function(url,callback){
			var el;
			this.log('loadCode',url,callback);
			if(url.indexOf(".js")>= 0){
				el = document.createElement("script");
				el.setAttribute('type',"text/javascript");
				el.src = url;
			}else if(url.indexOf(".css")>= 0){
				el = document.createElement("style");
				el.setAttribute('rel','stylesheet');
				el.setAttribute('type','text/css');
				el.setAttribute('href',url);
			}
			if(el){
				el.onload = function(){ callback.call(_obj,{'url':url}); };
				document.getElementsByTagName('head')[0].appendChild(el);
			}
			return _obj;
		};
		return this;
	}

	TimeSeries = new TimeSeriesMaster();

	// Object for each individual timeseries
	function TS(json,opt){
		if(!opt) opt = {};
		this.attr = opt;
		if(typeof json==="object"){
			this.json = json;
			this.vega = JSON.parse(JSON.stringify(json));
		}else if(typeof json==="string") this.file = json;
		this.logging = opt.logging || false;
		if(typeof opt.showaswego==="undefined") opt.showaswego = false;
		this.log('TS',json);

		// Set some defaults
		this.options = {
			xaxis: { 'title':'Time', log: false, fit:true },
			yaxis: { 'title': 'y-axis', log: false },
			grid: { hoverable: true, clickable: true, 'color': '#888888' },
			labels: { 'color': '#000000' },
			fit: false,
			tooltip: {'theme':'aas-theme'},
			showaswego: opt.showaswego
		};
		this.dateformats = {
			'default': {
				'title': 'Default'
			},
			'relative': {
				'title': 'Relative date',
				'formatLabel': function(val,attr){
					var sign = (val < 0) ? -1 : 1;
					val = Math.abs(val);
					var s = val*1;
					if(val == 0) return {'str':'0'};
					var b = ['y','d','h','m','s','ms'];
					var sec = {
						'y':86400*365.25*1000,
						'd':86400*1000,
						'h':3600*1000,
						'm':60*1000,
						's':1000,
						'ms':1
					};
					if(val < sec.ms) return {'str':(sign < 0 ? '-':'')+(val/1000)};
					var str = '';
					var inc = {};
					for(var i = 0,k=0; i < b.length; i++){
						k = 0;
						ds = sec[b[i]];
						if(s >= ds && s > 0) k = Math.floor(s/ds);
						if(b[i]=="y" && val >= ds) str += k+'y';
						if(b[i]=="d" && val >= ds && k > 0) str += (str ? ' ':'')+k+'d';
						if(b[i]=="h" && val >= sec.m && s > 0){ str += (str ? ' ':'')+zeroPad(k,2)+':'; inc.m = true; }
						if(b[i]=="m" && inc.m) str += zeroPad(k,2);
						if(b[i]=="s" && s > 0) str += (val < sec.m ? k : ':'+zeroPad(k,2));
						if(b[i]=="ms" && s > 0 && k > 0) str += '.'+zeroPad(k,3).replace(/0+$/,"");
						s -= k*ds;
					}
					return {'str':(sign < 0 ? '-':'')+str};
				}
			},
			'locale': {
				'title': 'Locale',
				'formatLabel': function(j){
					var d = new Date(parseInt(j));
					return {'str':d.toLocaleString()};
				}
			},
			'jd': {
				'title': 'Julian date',
				'scale': 86400000,
				'formatLabel': function(j){
					return {'str':formatDate(parseFloat(j),"jd")+''};
				}
			},
			'mjd': {
				'title': 'Modified Julian date',
				'scale': 86400000,
				'formatLabel': function(j){
					var mjd = formatDate(parseInt(j),"mjd");
					var o = {'str':mjd+''};
					o.truncated = mjd.toPrecision(this.x.precisionlabel+1);
					return o;
				}
			},
			'tjd': {
				'title': 'Truncated Julian date',
				'scale': 86400000,
				'formatLabel': function(j,attr){
					var tjd = formatDate(parseInt(j),"tjd");
					if(attr.dp > 0) tjd = tjd.toFixed(attr.dp);
					var o = {'str':tjd+''};
					return o;
				}
			}
		};
		this.datasets = [];
		this.directory = "";
		for(var o in opt){
			if(opt[o]){
				if(o=="directory") this[o] = opt[o];
				if(o=="fit" || o=="tooltip") this.options[o] = opt[o];	// https://github.com/vega/vega-tooltip/blob/master/docs/customizing_your_tooltip.md
			}
		}
		if(this.json) this.processJSON(json);

		return this;
	}

	TS.prototype.log = function(){
		if(this.logging || arguments[0]=="ERROR"){
			var args = Array.prototype.slice.call(arguments, 0);
			if(console && typeof console.log==="function"){
				if(arguments[0] == "ERROR") console.log('%cERROR%c TS: '+args[1],'color:white;background-color:#D60303;padding:2px;','',(args.splice(2).length > 0 ? args.splice(2):""));
				else console.log('%cTS%c','font-weight:bold;','',args);
			}
		}
		return this;
	};

	TS.prototype.processJSON = function(d){
		this.json = d;
		this.vega = JSON.parse(JSON.stringify(d));
		this.log('processJSON',d,this.json);
		if(d.width) this.options.width = d.width;
		if(d.height) this.options.height = d.height;
		if(d.padding) this.options.padding = d.padding;
		
		// Work out axes
		if(d.axes){
			for(var a = 0; a < d.axes.length; a++){
				var dim = "";
				if(d.axes[a].orient=="bottom") dim = "xaxis";
				if(d.axes[a].orient=="left") dim = "yaxis";
				if(dim) this.options[dim] = d.axes[a];
			}
		}
		this.options.logging = true;
		return this;
	};

	TS.prototype.postProcess = function(){

		this.log('postProcess',this);
		var i,a;

		// Over-ride the width/height if we are supposed to fit
		if(this.options.fit){
			this.options.width = this.initializedValues.w;
			this.options.height = this.initializedValues.h;
		}
		this.options.logging = this.logging;
		this.options.logtime = (location.search.indexOf('logtime=true')>0);
		this.options.xaxis.mode = 'time';
		this.options.scrollWheelZoom = true;
		if(this.json.scales){
			for(a = 0; a < this.json.axes.length; a++){
				for(i = 0; i < this.json.scales.length; i++){
					if(this.json.axes[a].scale == this.json.scales[i].name){
						axis = (this.json.axes[a].orient=="left" ? "yaxis":"xaxis");
						if(this.json.scales[i].type=="log") this.options[axis].log = true;
						if(this.json.scales[i].range) this.options[axis].range = this.json.scales[i].range;
						if(this.json.scales[i].domain) this.options[axis].domain = this.json.scales[i].domain;
					}
				}
			}
		}

		// Build the graph object
		this.graph = new Graph(this.el, [], this.options);

		var el = S(this.el);
		var str = '<div class="loader"><div class="spinner">';
		for(i = 1; i < 6; i++) str += '<div class="rect'+i+' seasonal"></div>';
		str += '</div></div>';
		el.addClass('timeseries').append(str);

		// Build the menu
		this.makeMenu();

		if(this.json) this.loadDatasets(this.json.data);

		return this;
	};
	
	TS.prototype.makeMenu = function(){
		var el = S(this.el);
		var id = el.attr('id');

		if(el.find('.menuholder').length == 0){
			layers = [{'key':'layers'},{'key':'config'},{'key':'save'}];
			var str = '';
			for(var i = 0; i < layers.length; i++) str += '<li><button '+(i==0 ? 'class="on" ':'')+'data="submenu-'+layers[i].key+'">'+getIcon(layers[i].key,'white')+'</button></li>';
			str += '<li></li>';
			el.prepend('<div class="menuholder"><input type="checkbox" id="'+id+'_hamburger" class="hamburger"><label for="'+id+'_hamburger" class="hamburger"><span class="nv">Toggle menu (if not visible)</span></label><menu class="timeseries-actions-wrapper"><ul class="submenu">'+str+'</ul><div class="menu-panel submenu-config"><div class="row"><button class="fullscreen icon" title="Toggle fullscreen">'+getIcon('fit')+'</button><button class="autozoom">Zoom to data</button></div><div class="row"><button class="fontup">A&plus;</button><button class="fontreset">A</button><button class="fontdn">A&minus;</button></div></div><div class="menu-panel submenu-layers on"><ol class="layers"></ol></div><div class="menu-panel submenu-save"><button class="savepng">Save as PNG</button><button class="savevega">Save as JSON (VEGA-compatible)</button><button class="editvega">Open in VEGA Editor</button></div></menu></div>');

			// Add button events
			el.find('.menuholder').on('mouseover',function(){ S('.graph-tooltip').css({'display':'none'}); });
			el.find('#'+id+'_hamburger').on('click',{me:this},function(e){
				var tab = (this[0].checked ? 0 : -1);
				this.parent().find('menu button, menu a').attr('tabIndex', tab);
			});
			el.find('button.fullscreen').on('click',{g:this.graph},function(e){ e.data.g.toggleFullScreen(); });
			el.find('button.autozoom').on('click',{g:this.graph},function(e){ e.data.g.zoom(); });
			el.find('button.fontup').on('click',{g:this.graph},function(e){ e.data.g.scaleFont(+1); });
			el.find('button.fontdn').on('click',{g:this.graph},function(e){ e.data.g.scaleFont(-1); });
			el.find('button.fontreset').on('click',{g:this.graph},function(e){ e.data.g.scaleFont(0); });
			el.find('button.savevega').on('click',{me:this},function(e){ e.data.me.save("vega"); });
			el.find('button.editvega').on('click',{me:this},function(e){ e.data.me.save("vegaeditor"); });
			el.find('button.savepng').on('click',{me:this},function(e){ e.data.me.save("png"); });

			el.find('.submenu button').on('click',{el:el},function(e){
				e.data.el.find('.on').removeClass('on');
				me = S(e.currentTarget);
				cls = me.attr('data');
				me.addClass('on');
				e.data.el.find('.menu-panel.'+cls).addClass('on');
			});

			// Build date selector
			var html = '<div class="row"><label for="'+id+'_dateformat">Date format: </label><select id="'+id+'_dateformat">';
			for(var k in this.dateformats){
				if(this.dateformats[k]){
					html += '<option value="'+k+'"'+(k=="default" ? ' selected="selected"':'')+'>'+this.dateformats[k].title+'</option>';
				}
			}
			html += '</select></div>';
			el.find('.menu-panel.submenu-config').append(html);
			el.find('#'+id+'_dateformat').on('change',{graph:this.graph,formats:this.dateformats},function(e){
				e.data.graph.x.labelopts = e.data.formats[this[0].value];
				console.log('labelopts',e.data.graph.x.labelopts);
				e.data.graph.defineAxis("x").calculateData().draw(true);
			});
		}
	};

	/*
		Render a TimeSeries from an HTML element 
		We look for attributes vega-src and vega-scale
	*/
	TS.prototype.initialize = function(e,callback){

		this.log('initialize',e);

		// Store the callback function
		if(typeof callback==="function") this.callback = callback;

		if(!e) console.log('ERROR',e,callback);

		var el = S(e);
		if(el.length == 0) return this;
		this.el = e;

		this.log('load',e,el,this.options.fit);

		var f = el.attr('vega-src');
		if(f) this.file = f;
		if(!this.file) this.file = "";
		if(typeof this.file!=="string") return this;
		if(typeof this.initializedValues==="undefined") this.initializedValues = {'w':e.clientWidth,'h':e.clientHeight};

		// Load any necessary extra js/css
		// Do we need to load some extra Javascript?
		if(typeof Graph==="undefined" && typeof Graph!=="function"){
			// Load the Javascript and, once done, call this function again
			TimeSeries.loadResources(basedir+"graph.js", {"this":this, "el":e}, function(ev){ this.log('loadedResources',ev,this); this.initialize(ev.data.el); });
		}else{
			if(this.file){
				// Load the Vega-JSON file
				var idx = this.file.lastIndexOf("/");
				this.directory = (idx >= 0) ? this.file.substr(0,idx+1) : "";
				S().ajax(this.file,{
					"dataType": "json",
					"this": this,
					"cache": true,
					"success": function(d,attr){
						this.processJSON(d);
						this.postProcess();
						return this;
					},
					"error": function(err){
						this.error("Unable to load configuration",this.file,err);
					}
				});
			}else{
				this.postProcess();
				return this;
			}
		}

		return this;
	};
	
	TS.prototype.loadDatasets = function(data){
		this.log('loadDatasets',data);
		if(!data) return this;
		this.datasets = {};
		var n,f,files,fn,i,j;
		n = data.length;
		f = "";
		files = [];
		fn = function(data,attr){
			var json;
			typ = "json";
			if(attr && attr.dataset && attr.dataset.format && attr.dataset.format.type=="csv") typ = "csv";
			if(typ == "csv") json = CSV2JSON(data,attr.dataset.format.parse);
			else if(typ == "json") json = data[0];
			this.datasets[attr.dataset.name] = {'json':json,'parse':attr.dataset.format.parse};
			this.datasets[attr.dataset.name][typ] = data;
			this.update(attr.dataset.name);
			if(TimeSeries.filesLoaded(attr.files)) this.loaded();
		};

		// Build an array of files to load
		for(i = 0; i < n; i++){
			if(data[i].url) files.push(this.directory + data[i].url);
		}

		this.log('files',files,TimeSeries.filesLoaded(files));

		// Process any inline values
		for(i = 0; i < n; i++){
			if(data[i].values) fn.call(this,data[i].values,{'dataset':data[i],'files':files});
		}

		for(j = 0; j < n; j++){
			// Load data and store it in datasets.
			// Update the graph if necessary
			// If we've loaded all data we then call loaded()
			TimeSeries.loadFromDataFile(files[j],{"this":this,"dataset":data[j],"files":files},fn);
		}

		return this;
	};

	TS.prototype.update = function(datasetID){

		var id,mark;
		this.olddatasetsused = this.datasetsused;
		this.datasetsused = "";

		this.log('update',datasetID);
		
		// This is much quicker than looseJsonParse
		// We'll use it for coordinates despite the eval()
		//var ev = function(str,datum){ return eval(str); };

		function updateProperties(d,event){
			var dest = {'size':'props','shape':'props','fill':'props','fillOpacity':'props','stroke':'props','strokeOpacity':'props','strokeWidth':'props','strokeCap':'props','strokeDash':'props','width':'props','height':'props','tooltip':'props','font':'props','fontSize':'props','fontWeight':'props','fontStyle':'props','baseline':'props','align':'props','dx':'props','angle':'props','limit':'props'};
			if(!d){
				console.log('updateProps fail',d,event);
				return;
			}
			datum = d.data;

			for(var p in event){
				if(event[p]){
					if(dest[p] && dest[p]=="props"){
						if(typeof event[p].value !== "undefined"){
							if(d.props.symbol) d.props.symbol[p] = event[p].value;
							if(d.props.format) d.props.format[p] = event[p].value;
						}
					}else{
						if(event[p].field && datum[event[p].field]) d.data[p] = datum[event[p].field];
						if(typeof event[p].value!=="undefined"){
							if(event[p].format && event[p].format=="date") datum[p] = (new Date(event[p].value)).getTime();
							else datum[p] = event[p].value;
						}
					}
					if(event[p].signal){
						to = dest[p] || "data";
						try { d[to][p] = looseJsonParse(event[p].signal); }
						catch(e) { _obj.log('Error',d.data,event[p]); }
						// If we now have an object we build a string
						if(p=="tooltip" && typeof d.props[p]==="object"){
							str = "<table>";
							for(var i in d.props[p]){
								if(typeof d.props[p][i] !== "undefined") str += "<tr><td>"+i+":</td><td>"+d.props[p][i]+"</td></tr>";
							}
							d.props[p] = str+"</table>";
						}
					}
				}
			}
			return d;
		}

		var _obj = this;

		for(var m = 0; m < this.json.marks.length; m++){
			id = "";
			mark = this.json.marks[m];
			if(mark.from && mark.from.data){
				id = mark.from.data;
				if(this.datasets[id]) this.datasetsused += id;
			}

			if(!id || this.datasets[id]){
				var desc = mark.description || "Markers "+(m+1);
				var dataset = { title: id, id: id, desc: desc, type: mark.type, clickable: true, css:{'background-color':'#000000'} };

				if(mark.type == "symbol") dataset.symbol = {show:true};
				else if(mark.type == "rect") dataset.rect = {show:true};
				else if(mark.type == "line") dataset.lines = {show:true};
				else if(mark.type == "rule") dataset.rule = {show:true};
				else if(mark.type == "area") dataset.area = {show:true};
				else if(mark.type == "text") dataset.text = {show:true};

				if(this.datasets[id]){
					dataset.data = clone(this.datasets[id].json);
					dataset.parse = this.datasets[id].parse;
				}else{
					dataset.data = [{'props':{'x':0,'y':0,'x2':0,'y2':0}}];
					dataset.parse = {};
				}

				// Add the dataset
				if(dataset){

					if(mark.encode && mark.encode.hover){
						dataset.hoverable = true;
						if(mark.encode.hover.fill) dataset.css['background-color'] = mark.encode.hover.fill.value;
					}

					dataset.encode = mark.encode;

					// Add callbacks
					if(mark.encode.enter) dataset.enter = function(datum,event){ return updateProperties(datum,event); };
					if(mark.encode.update) dataset.update = function(datum,event){ return updateProperties(datum,event); };
					if(mark.encode.hover) dataset.hover = function(datum,event){ return updateProperties(datum,event); };

					// Now we add this mark-based dataset
					this.graph.addDataset(dataset,m);

				}else{
					this.log('No dataset built for '+id,mark);
				}
			}
		}

		// If the current list of datasets used is different
		// to what we've already processed, we will update the graph
		if(this.datasetsused != this.olddatasetsused && this.attr.showaswego) this.graph.updateData();

		return this;
	};

	TS.prototype.loaded = function(){
		this.log('loaded',this.attr.showaswego,this.graph.data);
		var i,id,layers,l,p,k,w,h,draw,d,key;
		// If we haven't been updating the data for the graph we need to do that now
		if(this.attr.showaswego==false) this.graph.updateData();
		this.graph.canvas.container.find('.loader').remove();
		
		// Build layer-toggle menu (submenu-layers)
		layers = this.graph.canvas.container.find('.layers');
		// Remove any buttons we've already added
		layers.find('li').remove();
		keyitems = {};
		j = 1;
		for(i in this.graph.data){
		if(this.graph.data[i]){
			id = S(this.el).attr('id')+'_'+i;
			key = this.graph.data[i].desc;
			if(!keyitems[key]) keyitems[key] = [];
				keyitems[key].push(i);
				j++;
			}
		}
		j = 0;
		for(key in keyitems){
			if(keyitems[key]){
				id = S(this.el).attr('id')+'_'+j;
				d = this.graph.data[keyitems[key][0]];
				// Check if we've already added this
				if(layers.find('#'+id).length == 0){
					layers.append('<li><input type="checkbox" checked="checked" id="'+id+'" data="'+key+'" /><label for="'+id+'"><span class="key" style="background-color:'+d.format.fill+';'+(d.type=="area" && d.format.fillOpacity ? 'opacity:'+d.format.fillOpacity+';':'')+'"></span>'+key+'</label></li>');
					l = layers.find('#'+id);
					p = l.parent();
					k = p.find('.key');
					l.on('change',{me:this,k:keyitems[key]},function(e){
						g = e.data.me.graph;
						for(i = 0; i < e.data.k.length; i++){
							j = e.data.k[i];
							g.data[j].show = !g.data[j].show;
						}
						g.calculateData().draw(true);
						if(this.parent().find('input')[0].checked) this.parent().removeClass('inactive');
						else this.parent().addClass('inactive');
					}).on('focus',{layers:layers},function(e){
						e.data.layers.find('li').removeClass('on');
						this.parent().addClass('on');
					});
				}
			}
			// Do we need to draw key items?
			draw = false;
			for(i = 0; i < keyitems[key].length; i++){
				if(["symbol","rect","line","rule","text"].indexOf(d.type) >= 0) draw = true;
			}
				
			// Draw all the pieces that we need to
			if(draw && k && k[0]){
				w = k[0].offsetWidth;
				h = k[0].offsetHeight;
				k.html('<canvas style="width:'+w+'px;height:'+h+'px;"></canvas>');
				var c = k.find('canvas')[0];
				var ctx = c.getContext('2d');
				c.width = w;
				c.height = h;
				ctx.fillStyle = "#ffffff";
				ctx.rect(0,0,w,h);
				ctx.fill();
				for(i = 0; i < keyitems[key].length; i++){
					d = this.graph.data[keyitems[key][i]];
					k.css({'background-color':'none'});
					// Set the canvas style
					this.graph.setCanvasStyles(ctx,d.marks[0]);
					// Draw the different types
					if(d.type=="symbol"){
						this.graph.drawShape(d.marks[0],{'ctx':ctx,'x':w/2,'y':h/2});
					}else if(d.type=="rect"){
						this.graph.drawRect(d.marks[0],{'ctx':ctx,'x1':w/2,'y1':0,'x2':w/2,'y2':h});
					}else if(d.type=="line"){
						ctx.beginPath();
						ctx.moveTo(0,h/2);
						ctx.lineTo(w,h/2);
						ctx.stroke();
					}else if(d.type=="rule"){
						ctx.beginPath();
						ctx.moveTo(w/2,0);
						ctx.lineTo(w/2,h);
						ctx.stroke();
					}else if(d.type=="text"){
						this.graph.drawTextLabel("T",w/2,h/2,{'ctx':ctx,'format':{'align':'center','baseline':'middle'}});
					}
				}
			}
			j++;
		}
		
		// CALLBACK
		if(typeof this.callback==="function") this.callback.call(this);
		return this;
	};
	
	TS.prototype.save = function(type){

		// Bail out if there is no Blob function to save with
		if(typeof Blob!=="function") return this;
		var opts = { 'type': 'text/text', 'file': (this.file ?	this.file.replace(/.*\//g,"") : "timeseries.json") };

		function save(content){
			var asBlob = new Blob([content], {type:opts.type});
			function destroyClickedElement(event){ document.body.removeChild(event.target); }

			var dl = document.createElement("a");
			dl.download = opts.file;
			dl.innerHTML = "Download File";
			if(window.webkitURL != null){
				// Chrome allows the link to be clicked
				// without actually adding it to the DOM.
				dl.href = window.webkitURL.createObjectURL(asBlob);
			}else{
				// Firefox requires the link to be added to the DOM
				// before it can be clicked.
				dl.href = window.URL.createObjectURL(asBlob);
				dl.onclick = destroyClickedElement;
				dl.style.display = "none";
				document.body.appendChild(dl);
			}
			dl.click();
		
		}
		var txt;

		if(type == "vega" || type == "vegaeditor"){
			output = clone(this.vega);
			for(var i = 0; i < output.data.length; i++){
				delete output.data[i].url;
				typ = "json";
				if(this.datasets[output.data[i].name].csv) typ = "csv";
				output.data[i].values = this.datasets[output.data[i].name][typ];
			}
			txt = JSON.stringify(output);
		}
		if(type == "vega"){
			opts.type = "text/json";
			opts.file = (this.file ?	this.file.replace(/.*\//g,"") : "timeseries.json");
			save(txt);
		}
		if(type == "vegaeditor"){
			// Open in VEGA editor
			vegaeditor = window.open("https://vega.github.io/editor/#/", "VEGA", "");
			setTimeout(function(){
				vegaeditor.postMessage({
					"mode": "vega",
					"spec": txt,
					"config": {
					"axisY": {
						"minExtent": 30
					}
					},
					"renderer": "svg"
				}, "https://vega.github.io");
			},1000);
		}
		if(type == "png"){
			opts.type = "image/png";
			opts.file = "timeseries.png";
			this.graph.canvas.c.toBlob(save,opts.type);
		}

		return this;
	};
	
	TS.prototype.error = function(msg,extra,err){
		this.log('ERROR',msg,err);
		if(S(this.el).find('.loader').length == 0){
			S(this.el).html('<div class="loader"><div class="spinner"></div></div>').css({'position':'relative','width':'100%','height':'200px'});
		}
		// Replace spinner with error message
		if(S(this.el).find('.spinner').length > 0){
			S(this.el).find('.loader').html('&#9888; '+msg);
			this.remove();
		}
		S(this.el).find('.loader').append('<br />'+extra+'');

		return this;	
	};

	TS.prototype.remove = function(){
		S(this.el).find('.menuholder').remove();
		S(this.el).find('.canvasholder').remove();
		return {};
	};

	function getIcon(icon,colour){
		var icons = {
			'fit':'<path style="fill:%COLOUR%" d="M 0,12 L0,0 12,0 12,4 6,4 12,10 10,12 4,6 4,12 M20,0 L 32,0 32,12 28,12 28,6 22,12 20,10 26,4 20,4 20,0 M 20,32 L20,28 26,28 20,22 22,20 28,26 28,20 32,20, 32,32 20,32 M 12,32 L 0,32 0,20 4,20 4,26 10,20 12,22 6,28 12,28 12,32" />',
			'layers': '<path style="fill:%COLOUR%;fill-opacity:0.8;" d="M 16,6 l 12,6.5 -12,6.5 -12,-6.5Z" /><path style="fill:%COLOUR%;fill-opacity:0.8;" d="M 16,10.5 l 12,6.5 -12,6.5 -12,-6.5 Z" /><path style="fill:%COLOUR%;fill-opacity:0.8;" d="M 16,15 l 12,6.5 -12,6.5 -12,-6.5 Z" />',
			'config': '<path style="fill:%COLOUR%;fill-opacity:0.8;" d="M 13.971 4.5996 L 13.377 7.6992 L 13.453 7.6992 A 8.661 8.661 0 0 0 12.008 8.291 L 9.4785 6.5 L 6.5781 9.4004 L 8.3926 11.865 A 8.661 8.661 0 0 0 7.707 13.551 L 7.707 13.4 L 4.6074 13.9 L 4.6074 18 L 7.707 18.5 L 7.707 18.361 A 8.661 8.661 0 0 0 8.3945 20.033 L 6.5781 22.5 L 9.4785 25.4 L 12.01 23.609 A 8.661 8.661 0 0 0 13.395 24.189 L 13.971 27.199 L 18.033 27.199 L 18.547 24.215 A 8.661 8.661 0 0 0 20.014 23.621 L 22.529 25.4 L 25.43 22.5 L 23.635 20.059 A 8.661 8.661 0 0 0 24.289 18.496 L 27.369 18 L 27.369 13.9 L 24.283 13.402 A 8.661 8.661 0 0 0 23.631 11.848 L 25.43 9.4004 L 22.529 6.5 L 20.01 8.2832 A 8.661 8.661 0 0 0 18.564 7.6836 L 18.033 4.5996 L 13.971 4.5996 z M 15.988 10.828 A 5.0719 5.0719 0 0 1 21.061 15.9 A 5.0719 5.0719 0 0 1 15.988 20.973 A 5.0719 5.0719 0 0 1 10.916 15.9 A 5.0719 5.0719 0 0 1 15.988 10.828 z" />',
			'save': '<path style="fill:%COLOUR%;fill-opacity: 0.8;" d="M 6,26 l 20,0 0,-6 -6,0 -4,3 -4,-3 -6,0 Z M 16,20 l 8,-8 -5,0 0,-6 -6,0 0,6 -5,0" />'
		};
		return '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">'+(icons[icon]||"").replace(/%COLOUR%/g,(colour||"black"))+'</svg>';
	}

	/**
	 * CSVToArray parses any String of Data including '\r' '\n' characters,
	 * and returns an array with the rows of data.
	 * @param {String} CSV_string - the CSV string you need to parse
	 * @param {String} delimiter - the delimeter used to separate fields of data
	 * @returns {Array} rows - rows of CSV where first row are column headers
	 */
	function CSVToArray (CSV_string, delimiter) {
		delimiter = (delimiter || ","); // user-supplied delimeter or default comma

		var pattern = new RegExp( // regular expression to parse the CSV values.
			( // Delimiters:
				"(\\" + delimiter + "|\\r?\\n|\\r|^)" +
				// Quoted fields.
				"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
				// Standard fields.
				"([^\"\\" + delimiter + "\\r\\n]*))"
			), "gi"
		);

		var rows = [[]];	// array to hold our data. First row is column headers.
		// array to hold our individual pattern matching groups:
		var matches = false; // false if we don't find any matches
		// Loop until we no longer find a regular expression match
		while (matches = pattern.exec( CSV_string )) {
			var matched_delimiter = matches[1]; // Get the matched delimiter
			// Check if the delimiter has a length (and is not the start of string)
			// and if it matches field delimiter. If not, it is a row delimiter.
			if (matched_delimiter.length && matched_delimiter !== delimiter) {
				// Since this is a new row of data, add an empty row to the array.
				rows.push( [] );
			}
			var matched_value;
			// Once we have eliminated the delimiter, check to see
			// what kind of value was captured (quoted or unquoted):
			if (matches[2]) { // found quoted value. unescape any double quotes.
				matched_value = matches[2].replace(
					new RegExp( "\"\"", "g" ), "\""
				);
			} else { // found a non-quoted value
				matched_value = matches[3];
			}
			// Now that we have our value string, let's add
			// it to the data array.
			rows[rows.length - 1].push(matched_value);
		}
		return rows; // Return the parsed data Array
	}

	// Function to parse a CSV file and return a JSON structure
	// Guesses the format of each column based on the data in it.
	function CSV2JSON(data,parse){

		// Split by the end of line characters
		if(typeof data==="string") data = CSVToArray(data);

		var datum,formats,header,j,i;
		var newdata = [];

		formats = new Array(data[0].length);
		header = new Array(data[0].length);
		// Loop over each column in the line to find headers
		for(j=0; j < data[0].length; j++){
			header[j] = data[0][j];
			formats[j] = parse[header[j]] || "string";
		}

		for(i = 1 ; i < data.length; i++){
			// If there is no content on this line we skip it
			if(!data[i] || data[i] == "") continue;
			datum = {};
			// Loop over each column in the line
			for(j=0; j < data[i].length; j++){
				if(formats[j]=="number") datum[header[j]] = parseFloat(data[i][j]);
				else datum[header[j]] = data[i][j];
			}
			newdata.push(datum);
		}

		// Return the structured data
		return newdata;
	}

	function zeroPad(d,n){ if(!n){ n = 2;} d = d+''; while(d.length < n){ d = '0'+d; } return d; }
	
	function looseJsonParse(obj){
		var fns = "function zeroPad(d,n){ if(!n){ n = 2;} d = d+''; while(d.length < n){ d = '0'+d; } return d; };";
		fns += "function timeFormat(t,f){ var d = new Date(t); var micros = ''; var m = (t+'').match(/\\.([0-9]+)/);if(m && m.length==2){ micros = m[1]; } var ds = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];var dl = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];var ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];var ml = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return f.replace(/\%a/g,ds[d.getDay()]).replace(/\%Y/g,d.getFullYear()).replace(/\%a/g,dl[d.getDay()]).replace(/\%b/g,ms[d.getMonth()]).replace(/\%B/g,ml[d.getMonth()]).replace(/\%d/g,(d.getDate().length==1 ? '0':'')+d.getDate()).replace(/\%m/,(d.getMonth()+1)).replace(/\%H/,zeroPad(d.getUTCHours())).replace(/\%M/,zeroPad(d.getUTCMinutes())).replace(/\%S/,zeroPad(d.getUTCSeconds())).replace(/\%L/,zeroPad(d.getUTCMilliseconds(),3)+micros);};";
		//YES %a - abbreviated weekday name.*
		//YES %A - full weekday name.*
		//YES %b - abbreviated month name.*
		//YES %B - full month name.*
		// %c - the locale’s date and time, such as %x, %X.*
		//YES %d - zero-padded day of the month as a decimal number [01,31].
		// %e - space-padded day of the month as a decimal number [ 1,31]; equivalent to %_d.
		// %f - microseconds as a decimal number [000000, 999999].
		// %H - hour (24-hour clock) as a decimal number [00,23].
		// %I - hour (12-hour clock) as a decimal number [01,12].
		// %j - day of the year as a decimal number [001,366].
		// %m - month as a decimal number [01,12].
		// %M - minute as a decimal number [00,59].
		//YES %L - milliseconds as a decimal number [000, 999].
		// %p - either AM or PM.*
		// %Q - milliseconds since UNIX epoch.
		// %s - seconds since UNIX epoch.
		// %S - second as a decimal number [00,61].
		// %u - Monday-based (ISO 8601) weekday as a decimal number [1,7].
		// %U - Sunday-based week of the year as a decimal number [00,53].
		// %V - ISO 8601 week of the year as a decimal number [01, 53].
		// %w - Sunday-based weekday as a decimal number [0,6].
		// %W - Monday-based week of the year as a decimal number [00,53].
		// %x - the locale’s date, such as %-m/%-d/%Y.*
		// %X - the locale’s time, such as %-I:%M:%S %p.*
		//YES %y - year without century as a decimal number [00,99].
		//YES %Y - year with century as a decimal number.
		// %Z - time zone offset, such as -0700, -07:00, -07, or Z.
		// %% - a literal percent sign (%).

		// The month is zero-based for compatibility with VEGA
		// https://vega.github.io/vega/docs/expressions/#datetime
		fns += "function datetime(y,m,d,h,mn,sc,ms){ return (new Date(y+'-'+zeroPad(m+1,2)+'-'+(typeof d==='number' ? zeroPad(d,2):'01')+(typeof h==='number' ? 'T'+(zeroPad(h,2)+':'+(typeof mn==='number' ? zeroPad(mn,2)+(typeof sc==='number' ? ':'+zeroPad(sc,2)+(ms ? '.'+zeroPad(ms,3):''):''):'00'))+'Z':''))).valueOf(); }";
		fns += "function date(d){ return (new Date(d)).getTime(); }";
		return Function('"use strict";'+fns+' return (' + obj + ')')();
	}

	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}

	root.AASTimeSeriesEmbed = function(el,json,opt){
		var ts = TimeSeries.create(json,opt);
		ts.initialize(S(el)[0]);
		return;
	};

	// Convert dates
	function formatDate(dt,t){
		if(!t) t = "jd";
		var d = new JD(dt,"unix");
		if(t=="jd") return d.valueOf();
		else if(t=="mjd") return d.toMJD();
		else if(t=="tjd") return d.toTJD();
		else if(t=="iso") return d.toISOString();
		else return d;
	}

	// Can provide as:
	//	 1) (ms,"unix") - milliseconds since the UNIX epoch
	//	 2) (days,"mjd") - days since the MJD epoch
	//	 3) (seconds,"epoch","2000-01-01T00:00Z") - number of seconds since a user-defined epoch
	//	 4) ("1858-11-17T00:00:00.000001Z") - as an ISO8601 date string (can go to microseconds)
	//	 5) <undefined> - uses the current time
	function JD(jd,t,offs){
		epoch = 2440587.5;	// The Julian Date of the Unix Time epoch is 2440587.5
		var secs = 86400;
		var scale = secs*1e6;
		if(typeof jd==="number"){
			if(typeof t!=="undefined"){
				if(t=="unix") this.val = u2jd(jd);
				else if(t=="epoch" && offs) this.val = u2jd((new Date(offs)).getTime() + jd*1000);
				else if(t=="mjd") jd += 2400000.5;
				else if(t=="tjd") jd += 2440000.5;
			}
			if(!this.val){
				var days = Math.floor(jd);
				this.val = [days,(jd - days)*scale];
			}
		}else this.val = u2jd(jd);
		var _obj = this;

		this.valueOf = function(){ return _obj.val[0] + _obj.val[1]/scale; };
		this.toUNIX = function(){ return ((_obj.val[0]-epoch)*scale + _obj.val[1])/1e3; };	// Milliseconds
		this.toMJD = function(){ return (_obj.val[0]+(_obj.val[1]/scale)-2400000.5); };
		this.toTJD = function(){ return (_obj.val[0]+(_obj.val[1]/scale)-2440000.5); };
		this.toISOString = function(){ return (new Date(_obj.toUNIX())).toISOString().replace(/\.0*([^0-9])/,function(m,p){ return p; }); };

		// Deal with Julian Date in two parts to avoid rounding errors
		// Input is either:
		//		1) the number of milliseconds since 1970-01-01
		//		2) the ISO8601 date string (can go to microseconds)
		//		3) <undefined> - uses the current time
		function u2jd(today) {
			// The Julian Date of the Unix Time epoch is 2440587.5
			var days = 0;
			var rem = 0;
			var ms = 0;
			if(typeof today==="undefined"){
				today = new Date();
				ms = today.getTime();
			}else if(typeof today==="string"){
				// We'll take the decimal seconds and deal with
				// them separately to avoid rounding errors.
				var s = 0;
				today = today.replace(/(\:[0-9]{2})\.([0-9]+)/,function(m,p1,p2){ s = parseFloat("0."+p2); return p1; });
				ms = (new Date(today)).getTime();
				ms += s*1000;
			}else ms = today*1000;
			days = Math.floor(ms/scale);
			rem = (ms - days*scale) + scale/2;
			return [days + epoch - 0.5,rem];
		}
		return this;
	}

	root.TimeSeries = TimeSeries;

})(window || this);
