/*
	AAS Time Series graphing library.
	Written by Stuart Lowe
	
	INCLUDES:
	* Fix for setTimeout in IE - http://webreflection.blogspot.com/2007/06/simple-settimeout-setinterval-extra.html
	* Full screen API - http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
	
	USAGE:
		<html>
		<head>
			<script src="stuquery.js" type="text/javascript"></script>
			<script src="graph.js" type="text/javascript"></script>
			<script src="timeseries.js" type="text/javascript"></script>
			<script type="text/javascript">
			</script>
		</head>
		<body>
			<div id="lightcurve" style="width:100%;height:350px;font-size:0.8em;font-family:Century Gothic,sans-serif;"></div>
		</body>
		</html>
*/

var TimeSeries;

(function(){

	// First we will include all the useful helper functions
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
		var el = document.getElementById(el);
		if (el.currentStyle) style = el.currentStyle[styleProp];
		else if (window.getComputedStyle) style = document.defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
		if (style && style.length === 0) style = null;
		return style;
	}
	// End of helper functions

	TimeSeries = function(opt){
		if(!opt) opt = {};
		this.logging = opt.logging || false;
		this.options = {
			xaxis:{ label:'Time (HJD)', log: false, fit:true },
			yaxis: { label: 'Delta (mag)', log: false },
			grid: { hoverable: true, clickable: true }
		}
		this.datasets = [];
		if(typeof file==="string") this.file = file;

		return this;
	}
	TimeSeries.prototype.log = function(){
		if(this.logging){
			var args = Array.prototype.slice.call(arguments, 0);
			if(console && typeof console.log==="function") console.log('TimeSeries',args);
		}
		return this;
	}
	TimeSeries.prototype.renderElement = function(el,f){

		if(!el) return this;
		if(!f) f = S(el).attr('vega-src');
		var fit = ((S(el).attr('vega-scale') || "")=="inherit");
		this.file = f;
		this.log('load',el,f,fit);
		if(typeof this.file!=="string") return this;
		
		// Load any necessary extra js/css
		var _obj = this;
		// Do we need to load some extra Javascript?
		if(typeof Graph!=="function"){
			// Load the Javascript and, once done, call this function again
			this.log('loading graph.js');
			this.loadResources('resources/graph.js',function(){ _obj.log('loadedResources'); _obj.renderElement(el); });
		}else{
			// Load the file
			var idx = this.file.lastIndexOf("/");
			this.directory = (idx >= 0) ? this.file.substr(0,idx+1) : "";
			S().ajax(this.file,{
				"dataType": "json",
				"this": this,
				"cache": true,
				"element": el,
				"success": function(d,attr){
					this.json = d;
					if(d.width) this.options.width = d.width;
					if(d.height) this.options.height = d.height;
					if(d.padding) this.options.padding = d.padding;
					this.options.logging = true;
					if(fit){
						this.options.fit = true;
						var e = S(attr.element);
						this.options.width = parseInt(e.css('width'));
						this.options.height = parseInt(e.css('height'));
					}
					
					this.graph = new Graph(attr.element, [], this.options) // Need to make this target the correct element
					this.graph.canvas.container.append('<div class="loader"><div class="spinner"><div class="rect1 seasonal"></div><div class="rect2 seasonal"></div><div class="rect3 seasonal"></div><div class="rect4 seasonal"></div><div class="rect5 seasonal"></div></div></div>');
					this.loadDatasets(d.data);
					return this;
				}
			});
		};
	
		return this;
	}

	TimeSeries.prototype.loadResources = function(files,callback){

		// Load any necessary extra js/css for clustering
		if(typeof files==="string") files = [files];
		
		if(!this.extraLoaded) this.extraLoaded = {};
		for(var i = 0; i < files.length; i++){
			this.loadCode(files[i],function(e){
				this.extraLoaded[e.url] = true;
				var got = 0;
				for(var i = 0; i < files.length; i++){
					if(this.extraLoaded[files[i]]) got++;
				}
				if(got==files.length) callback.call(this);
			})
		}
	
		return this;
	}

	TimeSeries.prototype.loadDatasets = function(data){

		this.datasets = {};
		var dataloaded = 0;
		var n = data.length;

		for(var j = 0; j < n; j++){

			// Now grab the data
			S().ajax(this.directory + data[j].url,{
				"dataType": "csv",
				"this": this,
				"index":j,
				"dataset": data[j],
				"success": function(d,attr){
					// Remove extra newlines at the end
					d = d.replace(/[\n\r]$/,"");

					this.datasets[attr.dataset.name] = CSV2JSON(d,attr.dataset.format.parse);
					dataloaded++;
					this.update(attr.dataset.name);

					if(dataloaded == n) this.loaded();
				}
			});
		}

		return this;
	}

	TimeSeries.prototype.update = function(datasetID){

		var id,mark;
		this.olddatasetsused = this.datasetsused;
		this.datasetsused = "";

		for(var m = 0; m < this.json.marks.length; m++){
			id = "";
			mark = this.json.marks[m];
			if(mark.from.data) id = mark.from.data;
		
			if(this.datasets[id]){
				this.datasetsused += id;
			}
			
			if(this.datasets[id] && id==datasetID){
				var dataset;
				if(mark.type == "symbol") dataset = { data: this.datasets[id], symbol: {show:true}, title: id, lines: { show: false }, clickable: true,css:{'font-size':'0.8em','background-color':'#000000'} };
				else if(mark.type == "line") dataset = { data: this.datasets[id], symbol: {show:false}, title: id, lines: { show: true }, clickable: true,css:{'font-size':'0.8em','background-color':'#000000'} };

				// Add the dataset
				if(dataset){

					if(mark.encode && mark.encode.hover){
						dataset.hoverable = true;
						if(mark.encode.hover.fill) dataset.css['background-color'] = mark.encode.hover.fill.value;
						dataset.hoverprops = { text:'{{xlabel}}: {{x}}<br />{{ylabel}}: {{y}}<br />Uncertainty: {{err}}', before:'{{title}}<br />' };
					}

					dataset.encode = mark.encode;

					function updateCoordinates(d,event){
						datum = d.data;
						x2 = undefined;
						y2 = undefined;
						x = undefined;
						y = undefined;
						err = undefined;

						// Update the data
						if(event.x && event.x.field){
							if(datum[event.x.field]) x = datum[event.x.field];
							else{
								try { x = ev.call(datum,event.x.field,datum); }
								catch { console.log('Error',datum,event.x); }
							}
						}
						if(event.x2 && event.x2.field){
							if(datum[event.x2.field]) x2 = datum[event.x2.field];
							else{
								try { x2 = ev.call(datum,event.x2.field,datum); }
								catch { console.log('Error',datum,event.x2); }
							}
						}
						if(event.y && event.y.field){
							if(datum[event.y.field]) y = datum[event.y.field];
							else{
								try { y = ev.call(datum,event.y.field,datum); }
								catch { console.log('Error',datum,event.y); }
							}
						}
						if(event.y2 && event.y2.field){
							err = 0;
							if(datum[event.y2.field]) y2 = datum[event.y2.field];
							else{
								try { y2 = ev.call(datum,event.y2.field,datum); }
								catch { console.log('Error',datum,event.y2); }
							}
						}

						if(x && x2) x += (x2-x)/2;
						if(y && y2){
							datum.err = (y2-y)/2;
							y += datum.err;
						}

						if(x) datum.x = x;
						if(y) datum.y = y;

						d.data = datum;
						return d;
					}
					function updateProperties(d,event){
						var p = ['size','shape','fill','stroke','strokeWidth'];
						for(var i = 0; i < p.length;i++){
							if(event[p[i]] && event[p[i]].value){
								if(d.props.symbol) d.props.symbol[p[i]] = event[p[i]].value;
								if(d.props.format) d.props.format[p[i]] = event[p[i]].value;
							}
						}
						return d;
					}

					// Add callbacks
					if(mark.encode.enter){
						dataset.enter = function(datum,event){
							datum = updateProperties(datum,event);
							return updateCoordinates(datum,event);
						}
					}
					if(mark.encode.update){
						// Keep our evaluation contained
						var ev = function(str,datum){ return eval(str); }
						dataset.update = function(datum,event){
							datum = updateProperties(datum,event);
							return updateCoordinates(datum,event);
						}
					}
					if(mark.encode.hover){
						// Keep our evaluation contained
						var ev = function(str,datum){ return eval(str); }
						dataset.hover = function(datum,event){
							datum = updateProperties(datum,event);
							return updateCoordinates(datum,event);
						}
					}

					// Now we add this mark-based dataset
					this.graph.addDataset(dataset,m);

				}else{
					this.log('No dataset built for '+id,mark);
				}
			}
		}

		// If the current list of datasets used is different
		// to what we've already processed, we will update the graph
		if(this.datasetsused != this.olddatasetsused){
			this.log('updateData')
			this.graph.updateData();
		}

		return this;
	}
	TimeSeries.prototype.loaded = function(){
		this.log('loaded');
		this.graph.canvas.container.find('.loader').remove();;
		return this;
	}
	TimeSeries.prototype.loadCode = function(url,callback){
		var el;
		this.log('loadCode',url);
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
			var _obj = this;
			el.onload = function(){ callback.call(_obj,{'url':url}); };
			document.getElementsByTagName('head')[0].appendChild(el);
		}
		return this;
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

		var rows = [[]];  // array to hold our data. First row is column headers.
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

		var line,datum,header,types,rows;
		var newdata = new Array();
		var formats = new Array();
		var header = new Array();

		formats = new Array(data[0].length)
		header = new Array(data[0].length)
		// Loop over each column in the line to find headers
		for(var j=0; j < data[0].length; j++){
			header[j] = data[0][j];
			formats[j] = parse[header[j]] || "string";
		}

		for(var i = 1 ; i < data.length; i++){
			// If there is no content on this line we skip it
			if(!data[i] || data[i] == "") continue;
			
			datum = {};
			// Loop over each column in the line
			for(var j=0; j < data[i].length; j++){
				if(formats[j]!="string"){
					// "number", "boolean" or "date"
					if(formats[j]=="number"){
						data[i][j] = parseFloat(data[i][j]);
					}else if(formats[j]=="date"){
						data[i][j] = new Date(data[i][j].replace(/^"/,"").replace(/"$/,""));
					}else if(formats[j]=="boolean"){
						if(data[i][j]=="1" || data[i][j]=="true" || data[i][j]=="Y") data[i][j] = true;
						else if(data[i][j]=="0" || data[i][j]=="false" || data[i][j]=="N") data[i][j] = false;
						else data[i][j] = null;
					}
				}
				datum[header[j]] = data[i][j];
				//if(header[j]=="HJD") datum['x'] = data[i][j];
				//if(header[j]=="dmag") datum['y'] = data[i][j];
			}
			newdata.push(datum);
		}

		// Return the structured data
		return newdata;
	}
	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}

})(S);