(function(root){

	function WebGLGraph(attr){
		if(!attr) attr = {};
		this.log = new window.Logger({'id':'WebGLGraph','logging':attr.logging,'logtime':attr.logtime});

		let currentScale = [range.x.max,range.y.max];
		let currentTranslation = [0,0];
		let fillColor = [255/255, 255/255, 0/255, 0.5];
		let strokeColor = [255/255, 0/255, 0/255, 0.5];
		let strokeWidth = 5.0;
		let aVertexPosition;
		let gl = {'id':'canvas'};
		let canvas = {'id':'canvas2'};
		var view = new Matrix();
		var viewPort = {'left':150, 'top':100, 'right':10, 'bottom':10};
		let layers = [];

		let shaders = {
			'symbol': {
				'vertex': {'src':`
					attribute vec2 aVertexPosition;	// position of sprite
					uniform mat3 uMatrix;
					uniform float uPointSize;
					uniform bool uYLog;
					uniform float uYLogMin;
					uniform float uYLogMax;
					vec2 posV;
					//float range;
					float log10(float v){
						return log(v)/2.302585092994046;
					}

					void main() {
						posV = (uMatrix * vec3(aVertexPosition, 1)).xy;
						if(uYLog){
							//range = uYLogMax - uYLogMin;
							//if(posV.y > 0.0) posV.y = log10(posV.y)/range;
							//else posV.y = -2.0;
						}
						gl_Position = vec4(posV, 0.1, 1);
						gl_PointSize = uPointSize;
					}`
				},
				'fragment':	{'src':`
					#ifdef GL_ES
					precision highp float;
					#endif
					uniform sampler2D uTexture;	// texture we are drawing
					void main() {
						gl_FragColor = texture2D(uTexture, gl_PointCoord);
					}`
				}
			},
			'line': {
				'vertex': {'src':`
					attribute vec2 aVertexPosition;	// position of vertex
					attribute vec2 aNormalPosition;	// position of normal
					uniform mat3 uMatrix;
					uniform bool uYLog;
					uniform float uYLogMin;
					uniform float uYLogMax;
					uniform float u_linewidth;
					uniform vec2 uSize;
					uniform int u_type;
					float scale_x;
					float scale_y;
					vec2 posV;
					vec2 posN;

					void main() {
						// Convert line width to final coords space in x and y
						scale_x = u_linewidth / uSize.x;
						scale_y = u_linewidth / uSize.y;

						posV = (uMatrix * vec3(aVertexPosition, 1)).xy;
						posN = aNormalPosition;
						if(u_type==1){
							posV.x = (aVertexPosition.x==0.0) ? -1.0 : 1.0;
						}else if(u_type==2){
							posV.y = (aVertexPosition.y==0.0) ? -1.0 : 1.0;
						}
						gl_Position = vec4(posV.x + posN.x * scale_x, posV.y + posN.y * scale_y, 1.0, 1);
					}`
				},
				'fragment':	{'src':`
					#ifdef GL_ES
					precision highp float;
					#endif
					uniform vec4 uColor;
					void main(void) {
						gl_FragColor = uColor;
					}`
				}
			},
			'area': {
				'vertex': {'src':`
					attribute vec2 aVertexPosition;	// position of vertex
					uniform mat3 uMatrix;
					uniform bool uYLog;
					uniform float uYLogMin;
					uniform float uYLogMax;
					vec2 posV;

					void main() {
						posV = (uMatrix * vec3(aVertexPosition, 1)).xy;
						gl_Position = vec4(posV, 1.0, 1);
					}`
				},
				'fragment':	{'src':`
					#ifdef GL_ES
					precision highp float;
					#endif
					uniform vec4 uColor;
					void main(void) {
						gl_FragColor = uColor;
					}`
				}
			}
		}

		this.addLayer = function(l){
			layers.push(l);
			return this;
		}

		this.init = function(){

			this.log.time('full');
			this.log.time('init');
			var _obj = this;

			gl.canvas = document.getElementById(gl.id);

			this.log.time('getContext webgl');
			function throwOnGLError(err, funcName, args) {
				throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
			};
			function logAndValidate(functionName, args) {
				//logGLCall(functionName, args);
				//validateNoneOfTheArgsAreUndefined(functionName, args);
			}
			function logGLCall(functionName, args){
				_obj.log.message("gl." + functionName + "(" + WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");	 
			}
			function validateNoneOfTheArgsAreUndefined(functionName, args){
				for(var ii = 0; ii < args.length; ++ii){
					if(args[ii]===undefined) _obj.log.error("undefined passed to gl." + functionName + "(" + WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
				}
			} 
			gl.ctx = WebGLDebugUtils.makeDebugContext(gl.canvas.getContext("webgl"),throwOnGLError,logAndValidate);
			this.log.time('getContext webgl');
			let s,n,i,t,a;

			this.log.time("buildShaders");
			for(t in shaders){
				for(s in shaders[t]) shaders[t][s].shader = compileShader(gl.ctx, s, shaders[t][s]);
			}
			this.log.time("buildShaders");

			this.log.time('buildLayers');
			i = 0;
			for(n = 0; n < layers.length; n++){
			
				this.log.time("buildShaderProgram for "+n)
				layers[n].program = gl.ctx.createProgram();
				t = layers[n].type;
				st = layers[n].shader;
				for(s in shaders[st]){
					if(shaders[st][s].shader) gl.ctx.attachShader(layers[n].program, shaders[st][s].shader);
				}
				this.log.time("buildShaderProgram for "+n)

				// Set the type for drawArrays
				a = gl.ctx.POINTS;
				if(t=="symbol") a = gl.ctx.POINTS;
				else if(t=="area" || t=="rect") a = gl.ctx.TRIANGLES;
				else if(t=="line" || t=="rule" || t=="rect") a = gl.ctx.TRIANGLE_STRIP;
				layers[n].drawArrays = a;


				this.log.time("linkProgram for "+n)
				gl.ctx.linkProgram(layers[n].program);
				if(!gl.ctx.getProgramParameter(layers[n].program, gl.ctx.LINK_STATUS)) {
					this.log.error("Error linking shader program:");
					this.log.message(gl.ctx.getProgramInfoLog(layers[n].program));
				}
				this.log.time("linkProgram for "+n)

				this.log.time('get locations');
				layers[n].loc = {};
				layers[n].loc.matrix = gl.ctx.getUniformLocation(layers[n].program, "uMatrix");
				layers[n].loc.yLog = gl.ctx.getUniformLocation(layers[n].program, "uYLog");
				layers[n].loc.yLogMin = gl.ctx.getUniformLocation(layers[n].program, "uYLogMin");
				layers[n].loc.yLogMax = gl.ctx.getUniformLocation(layers[n].program, "uYLogMax");
				if(t=="symbol"){
					layers[n].loc.Texture = gl.ctx.getUniformLocation(layers[n].program, "uTexture");
					if(layers[n].size) layers[n].loc.PointSize = gl.ctx.getUniformLocation(layers[n].program, "uPointSize");
				}else if(t=="line" || t=="rule" || t=="rect"){
					layers[n].loc.color = gl.ctx.getUniformLocation(layers[n].program, "uColor");
					layers[n].loc.strokeWidth = gl.ctx.getUniformLocation(layers[n].program, "u_linewidth");
					layers[n].loc.size = gl.ctx.getUniformLocation(layers[n].program, "uSize");
					layers[n].loc.type = gl.ctx.getUniformLocation(layers[n].program, "u_type");
	//			}else if(t=="rect"){
	//				layers[n].loc.fillColor = gl.ctx.getUniformLocation(layers[n].program, "uFillColor");
	//				layers[n].loc.strokeColor = gl.ctx.getUniformLocation(layers[n].program, "uStrokeColor");
	//				layers[n].loc.strokeWidth = gl.ctx.getUniformLocation(layers[n].program, "uStrokeWidth");
				}else if(t=="area"){
					layers[n].loc.color = gl.ctx.getUniformLocation(layers[n].program, "uColor");
				}
				this.log.time('get locations');


				layers[n].buffer = gl.ctx.createBuffer();
				gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, layers[n].buffer);
				if(t=="symbol"){
					layers[n].vertices = makePoints(layers[n].data);
					layers[n].vertex = { 'components': 2, 'count': layers[n].data.length/2 };
				}else if(t=="line" || t=="rule"){
					layers[n].vertices = makeLines(layers[n].data);
					layers[n].vertex = { 'components': 2, 'count': 4 * (layers[n].data.length - 1) };
				}else if(t=="rect"){
					layers[n].vertices = makeRects(layers[n].data);
					layers[n].vertex = { 'components': 2, 'count': 4 * (layers[n].data.length - 1) };
				}else if(t=="area"){
					layers[n].vertices = makeAreas(layers[n].data);
					layers[n].vertex = { 'components': 2, 'count':layers[n].vertices.length/2 };
				}
				gl.ctx.bufferData(gl.ctx.ARRAY_BUFFER, layers[n].vertices, gl.ctx.STATIC_DRAW);
				// Unbind the buffer
				gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, null);


				// Create icon and sprite
				let attr = layers[n].style;
				if(layers[n].type=="symbol"){
					attr.output = "texture";
					attr.size = layers[n].size;
					layers[n].icon = Icon(layers[n].shape||"circle",attr);
					layers[n].texture = gl.ctx.createTexture();
					gl.ctx.activeTexture(gl.ctx.TEXTURE0+n);	// this is the nth texture
					gl.ctx.bindTexture(gl.ctx.TEXTURE_2D, layers[n].texture);
					gl.ctx.pixelStorei(gl.ctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
					gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_MAG_FILTER, gl.ctx.NEAREST);
					gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_MIN_FILTER, gl.ctx.NEAREST);
					gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_WRAP_S, gl.ctx.CLAMP_TO_EDGE);
					gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_WRAP_T, gl.ctx.CLAMP_TO_EDGE);
					gl.ctx.texImage2D(gl.ctx.TEXTURE_2D, 0, gl.ctx.RGBA, gl.ctx.RGBA, gl.ctx.UNSIGNED_BYTE, layers[n].icon);

				}
				// Make SVG versions
				c = document.createElement('li');
				c.setAttribute('data',n);
				attr.output = "svg";
				attr.width = 32;
				attr.height = 32;

				if(layers[n].type=="symbol"){
					c.innerHTML = Icon(layers[n].shape||"circle",attr);
					c.setAttribute('class','icon active');
				}else if(layers[n].type=="area"){
					attr.size = attr.width;
					delete attr.strokeWidth;
					c.innerHTML = Icon("square",attr)+' '+layers[n].type;
					c.setAttribute('class','icon active area');
				}else{
					attr.size = attr.width;
					var orientation = "h";
					if(layers[n].style.type=="fullHeight") orientation = "v";
					if(layers[n].type=="rule" && layers[n].data[0].x==layers[n].data[1].x) orientation = "v";
					c.innerHTML = Icon((orientation=="h" ? "m-0.5,0 l 1,0" : "m0,-0.5 l 0,1"),attr)+' '+layers[n].type;
					c.setAttribute('class','icon active label');
				}
				c.addEventListener('click', function(){
					i = parseInt(this.getAttribute('data'));
					if(i < layers.length) layers[i].hide = !layers[i].hide;
					this.classList.toggle('active');
					_obj.draw();
				});
				document.body.appendChild(c);

			}
			this.log.time('buildLayers');

			this.log.time('init');

			var cs = document.getElementById('canvas');
			cs.addEventListener('wheel',function(e){
				e.preventDefault();
				if(e.deltaY < 0){
					currentScale[0] /= 1.2;
					currentScale[1] /= 1.2;
				}else{
					currentScale[0] *= 1.2;
					currentScale[1] *= 1.2;
				}
				_obj.draw();
			})

			window.addEventListener('keydown',function(e){
				if(e.keyCode==37){
					e.preventDefault();
					currentTranslation[0] -= 0.01;
					_obj.draw();
				}else if(e.keyCode==39){
					e.preventDefault();
					currentTranslation[0] += 0.01;
					_obj.draw();
				}else if(e.keyCode==38){
					e.preventDefault();
					currentTranslation[1] += 0.01;
					_obj.draw();
				}else if(e.keyCode==40){
					e.preventDefault();
					currentTranslation[1] -= 0.01;
					_obj.draw();
				}
				i = parseInt(e.key);
				if(typeof i==="number"){
					if(i < layers.length) layers[i].hide = !layers[i].hide;
					_obj.draw();
				}else if(e.key == "a"){
					currentScale = [1/5,1/5];
					_obj.draw();
				}else if(e.key == "s"){
					currentScale = [1,1];
					_obj.draw();
				}else if(e.key == "d"){
					currentScale = [5,5];
					_obj.draw();
				}
			});

			this.log.time('full');
		}

		this.draw = function(){

			this.log.time('draw');
			let scale = [currentScale[0],currentScale[1]];
			// Define the viewport area in pixels (x,y,w,h)
			gl.ctx.viewport(viewPort.left, viewPort.top, gl.canvas.clientWidth-150-viewPort.right, gl.canvas.clientHeight-100-viewPort.bottom);
			gl.ctx.clearColor(0, 0, 0, 0);
			gl.ctx.clear(gl.ctx.COLOR_BUFFER_BIT | gl.ctx.DEPTH_BUFFER_BIT);
			gl.ctx.enable(gl.ctx.BLEND);
			gl.ctx.depthMask(false);

			// https://webglfundamentals.org/webgl/lessons/webgl-text-texture.html
			gl.ctx.blendFunc(gl.ctx.SRC_ALPHA, gl.ctx.ONE_MINUS_SRC_ALPHA);

			// Update view
			view = view.setIdentity().translate(currentTranslation[0],currentTranslation[1]).scale(2/scale[0], 2/scale[1]).translate(-1,-1);

			for(var n = 0 ; n < layers.length; n++){
				if(!layers[n].hide){
					gl.ctx.useProgram(layers[n].program);
					t = layers[n].type;

					if(layers[n].loc.matrix) gl.ctx.uniformMatrix3fv(layers[n].loc.matrix, false, view.v);
					// Set colour
					if(layers[n].loc.color){
						c = (t=="line" || t=="rule" || t=="rect") ? (getRGBA(layers[n].style.strokeStyle)||strokeColor) : (getRGBA(layers[n].style.fillStyle)||fillColor);
						gl.ctx.uniform4fv(layers[n].loc.color,c);
					}
					// Set stroke width
					if(layers[n].loc.strokeWidth) gl.ctx.uniform1f(layers[n].loc.strokeWidth, (layers[n].style.strokeWidth||strokeWidth));
		//			gl.ctx.uniform1i(layers[n].loc.yLog, true);
		//			gl.ctx.uniform1f(layers[n].loc.yLogMin,-1.0);
		//			gl.ctx.uniform1f(layers[n].loc.yLogMax,1.2);
					if(t=="symbol"){
						gl.ctx.uniform1i(layers[n].loc.Texture, n,layers[n].style.strokeStyle);
						if(layers[n].size) gl.ctx.uniform1f(layers[n].loc.PointSize,layers[n].icon.width);
						gl.ctx.activeTexture(gl.ctx.TEXTURE0+n);	// this is the nth texture
					}

					// Only called when not initiated
					if(!layers[n].initiated && layers[n].vertex){
						// Set if this is a logarithmic scale
						if(layers[n].loc.size) gl.ctx.uniform2fv(layers[n].loc.size, [gl.canvas.clientWidth,gl.canvas.clientHeight]);
						// For rule types set if it covers the full width/height
						if(layers[n].loc.type) gl.ctx.uniform1i(layers[n].loc.type, (layers[n].style.type=="fullWidth" ? 1 : layers[n].style.type=="fullHeight" ? 2 : 0));


						gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, layers[n].buffer);
						aVertexPosition = gl.ctx.getAttribLocation(layers[n].program, "aVertexPosition");
						gl.ctx.vertexAttribPointer(aVertexPosition, layers[n].vertex.components, gl.ctx.FLOAT, false, 0, 0);
						gl.ctx.enableVertexAttribArray(aVertexPosition);
				
						if(t=="line" || t=="rule" || t=="rect"){
							aNormalPosition = gl.ctx.getAttribLocation(layers[n].program, "aNormalPosition");
							gl.ctx.vertexAttribPointer(aNormalPosition, layers[n].vertex.components, gl.ctx.FLOAT, false, 0, layers[n].vertex.count * 8);
							gl.ctx.enableVertexAttribArray(aNormalPosition);
						}
						layers[n].inititated;
					}

					gl.ctx.drawArrays(layers[n].drawArrays, 0, layers[n].vertex.count);
				}
			}
		
			this.log.time('draw');
		}

		function compileShader(gl, typ, attr){
			let type = (typ=="vertex") ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER;
			let code = attr.src;
			let shader = gl.createShader(type);
			gl.shaderSource(shader, code+'');
			gl.compileShader(shader);
			if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				console.log(`Error compiling ${typ} shader:`);
				console.log(gl.getShaderInfoLog(shader));
			}
			return shader;
		}

		return this;
	}


	function getRGBA(c,a){
		a = (a||1.0);
		var rgb;
		if(c.indexOf("rgb")==0) c.replace(/rgba?\(([0-9]+),([0-9]+),([0-9]+),?([0-9\.]+)?/,function(m,p1,p2,p3,p4){ rgb = [parseInt(p1)/255,parseInt(p2)/255,parseInt(p3)/255,(parseFloat(p4)||a)]; return ""; });
		else if(c.indexOf('#')==0) rgb =[parseInt(c.substr(1,2),16)/255,parseInt(c.substr(3,2),16)/255,parseInt(c.substr(5,2),16)/255,a];
		return rgb;
	}

	function Matrix(m){
		this.type = "matrix";
		identity = [1,0,0,0,1,0,0,0,1];
		if(m) this.v = m;
		else this.v = identity;

		this.setIdentity = function(){
			this.v = identity;
			return this;
		}
		this.translate = function(tx,ty){
			this.v = this.multiply([1,0,0,0,1,0,tx,ty,1]);
			return this;
		}
		this.scale = function(sx, sy){
			this.v = this.multiply([sx,0,0,0,sy,0,0,0,1]);
			return this;
		}
		this.multiply = function(m){
			if(m.length == 3 && typeof m[0]==="number"){
				// Point
				return [(m[0]*this.v[0]) + (m[1]*this.v[3]) + (m[2]*this.v[6]), (m[0]*this.v[1]) + (m[1]*this.v[4]) + (m[2]*this.v[7]), (m[0]*this.v[2]) + (m[1]*this.v[5]) + (m[2]*this.v[8])];
			}else{
				// Multiply each column by the matrix
				var r0 = this.multiply([m[0], m[3], m[6]]);
				var r1 = this.multiply([m[1], m[4], m[7]]);
				var r2 = this.multiply([m[2], m[5], m[8]]);
				// Turn the result columns back into a single matrix
				return [r0[0],r1[0],r2[0],r0[1],r1[1],r2[1],r0[2],r1[2],r2[2]];
			}
		}
		return this;
	}

	function makePoints(original){
		var vertices = new Float32Array(original.length*2);
		for(i = 0; i < original.length ; i++){
			// Build point-based vertices
			vertices[i*2] = original[i].x;
			vertices[i*2 + 1] = original[i].y;
		}
		return vertices;
	}

	function makeAreas(o){
		var areas = [];
		// We need to loop across the data first splitting into segments
		for(i = 0, a = 0; i < o.length ; i++){
			p = o[i];
			y1 = (typeof p.y1==="number" ? p.y1 : p.y);
			y2 = (typeof p.y2==="number" ? p.y2 : y1);
			if(!isNaN(p.x) && !isNaN(y1) && !isNaN(y2)){
				if(!areas[a]) areas[a] = [];
				areas[a].push(i);
			}else a++;
		}

		var vertices = [];
		
		// To do: make the polygon lookup processing more efficient by
		// not processing the entire shape in one go
		var poly = new Array(areas.length);
		for(a = 0; a < areas.length ; a++){
			if(areas[a] && areas[a].length){
				for(j = 0; j < areas[a].length-1; j++){
					p1 = o[areas[a][j]];
					p2 = o[areas[a][j+1]];
					vertices = vertices.concat([p1.x,p1.y2,p1.x,p1.y1,p2.x,p2.y1,p1.x,p1.y2,p2.x,p2.y2,p2.x,p2.y1]);
				}
			}
		}
		return new Float32Array(vertices);
	}
	
	function makeLines(original){
		// TR: compute normal vector
		var vertices = [];

		var o = new Array(original.length*2);
		for(i = 0; i < original.length;i++){
			o[i*2] = original[i].x;
			o[i*2 + 1] = original[i].y;
		}

		function normal_vector(dx, dy){
			norm = (dx * dx + dy * dy) ** 0.5;
			return -dy / norm, dx / norm;
		}

		for(i = 0; i < (o.length / 2 - 1) * 4; i++){
			// Add vertex
			ivert = Math.floor((i + 2) / 4);
			vertices.push(o[2 * ivert]);
			vertices.push(o[2 * ivert + 1]);
		}

		for(i = 0; i < (o.length / 2 - 1) * 4; i++){
			// Find normal vector
			ibeg = Math.floor(i / 4);
			iend = ibeg + 1;
			dx = o[2 * iend] - o[2 * ibeg];
			dy = o[2 * iend + 1] - o[2 * ibeg + 1];
			scale = (dx * dx + dy * dy) ** 0.5;
			vertices.push(-dy / scale * (-1) ** i);
			vertices.push(dx / scale * (-1) ** i);
		}
		return new Float32Array(vertices);
	}

	function makeRects(original){
		// TR: compute normal vector
		var o = new Array(original.length*2);
		var x1,x2,y1,y2;
		for(i = 0; i < original.length;i++){
			if(typeof original[i].x=="number"){
				x1 = original[i].x;
				x2 = original[i].x;
			}
			if(typeof original[i].x1=="number") x1 = original[i].x1;
			if(typeof original[i].x2=="number") x2 = original[i].x2;
			if(typeof original[i].y=="number"){
				y1 = original[i].y;
				y2 = original[i].y;
			}
			if(typeof original[i].y1=="number") y1 = original[i].y1;
			if(typeof original[i].y2=="number") y2 = original[i].y2;

			o[i*2] = {'x':x1,'y':y1 };
			o[i*2 + 1] = {'x':x2,'y':y2 };
		}
		return makeLines(o)
	}

	function Path(path){
		this.path = path;
		this.p = path;
		this.size = 1;
		this.off = 0;

		if(typeof path==="string"){
			this.path = path;
			this.p = path.match(/[A-Za-z][^A-Za-z]*/g)
			for(var i = 0; i < this.p.length; i++){
				bits = [];
				this.p[i].replace(/ $/,"").replace(/^([A-Za-z]) ?(.*)$/,function(m,p1,p2){ bits = [p1,p2]; return ""; });
				this.p[i] = bits;
				if(this.p[i][1]){
					this.p[i] = [this.p[i][0]].concat(this.p[i][1].split(/ /));
					for(var j = 1; j < this.p[i].length; j++){
						this.p[i][j] = this.p[i][j].split(/\,/);
						for(var k = 0; k < this.p[i][j].length; k++) this.p[i][j][k] = parseFloat(this.p[i][j][k]);
					}
				}else this.p[i].splice(1,1);
			}
		}
		this.setOrigin = function(x,y){
			this.o = {'x':x,'y':y};
			return this;
		}
		this.setSize = function(s){
			this.size = s;
			return this;
		}
		this.draw = function(ctx){
			let x = 0;
			let y = 0;
			let first;
			let t = "";
			var size = this.size;
			// Change origin
			if(this.o){
				x = this.o.x;
				y = this.o.y;
				ctx.moveTo(x,y);
			}
			for(var i = 0; i < this.p.length; i++){
				t = this.p[i][0];
				uc = (this.p[i][0]==this.p[i][0].toUpperCase());
				if(this.p[i].length > 1){
					for(var j = 1; j < this.p[i].length; j++){
						if(t=="m" || t=="l"){ x += this.p[i][j][0]*size; y += this.p[i][j][1]*size; }
						else if(t=="M" || t=="L"){ x = this.p[i][j][0]*0.5*size + this.o.x; y = this.p[i][j][1]*0.5*size + this.o.y; }
						else if(t=="h") x += this.p[i][j][0]*size;
						else if(t=="H") x = this.p[i][j][0]*0.5*size + this.o.x;
						else if(t=="v") y += this.p[i][j][0]*size;
						else if(t=="V") y = this.p[i][j][0]*0.5*size + this.o.y;
						
						if(t.toLowerCase()=="m") ctx.moveTo(x,y);
						else ctx.lineTo(x,y);
						if(!first) first = {'x':x,'y':y};
					}
				}else{
					if(t=="Z") ctx.lineTo(first.x,first.y);
				}
			}
			return this;
		}
		this.toString = function(){
			var str = '';
			var size = this.size;
			for(var i = 0; i < this.p.length; i++){
				str += (i>0 ? ' ':'')+this.p[i][0];
				uc = (this.p[i][0]==this.p[i][0].toUpperCase());
				for(var j = 1; j < this.p[i].length; j++){
					str += ' ';
					if(typeof this.p[i][j]==="number") str += this.p[i][j]*(uc ? 0.5 : 1)*size+(uc ? this.o.x : 0);
					else{
						for(var k = 0; k < this.p[i][j].length; k++){
							if(k > 0) str += ',';
							if(typeof this.p[i][j][k]=="number") str += this.p[i][j][k]*(uc ? 0.5 : 1)*size+(uc ? this.o.x : 0);
						}
					}
				}
			}
			if(this.o) str = 'M '+this.o.x+' '+this.o.y+' '+str;
			return str;
		}
		this.svg = function(attr){
			if(!attr) attr = {};
			if(!attr.width) attr.width = 32;
			if(!attr.height) attr.height = 32;
			var svg = '<svg width="'+attr.width+'" height="'+attr.height+'"	viewBox="0 0 '+attr.width+' '+attr.height+'" xmlns="http://www.w3.org/2000/svg">';
			svg += '<path d="'+this.toString()+'" fill="'+attr.fillStyle+'" stroke="'+attr.strokeStyle+'" stroke-width="'+attr.strokeWidth+'">'
			svg += '</svg>';
			return svg;
		}
		return this;
	}

//	function toPowerTwo(n){
//		return Math.pow(2,Math.ceil(Math.log2(n)/Math.log2(2)));
//	}

	function Icon(shape,attr){

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
		
		if(!attr) attr = {};
		attr.strokeWidth = (attr.strokeWidth || 0);
		let paper = { 'c': document.createElement('canvas') };
		let s2 = (attr.size+attr.strokeWidth*2);
		let w = attr.width || s2;
		let h = attr.height || s2;
		// Set properties of the temporary canvas
		paper = setWH(paper,w,h,window.devicePixelRatio);
		paper.ctx.clearRect(0,0,w,h);
		paper.ctx.fillStyle = attr.fillStyle;
		if(attr.strokeWidth) paper.ctx.strokeStyle = attr.strokeStyle;
		paper.ctx.lineWidth = attr.strokeWidth;
		paper.ctx.lineCap = "square";
		if(shape!="stroke") paper.ctx.beginPath();

		let cx = (w/2);
		let cy = (h/2);
		let dw = attr.size/2;
		let path;

		// https://vega.github.io/vega/docs/marks/symbol/
		if(shape=="circle"){
			paper.ctx.arc(cx,cy,(dw || 4),0,Math.PI*2,false);
			paper.ctx.fill();
			if(attr.strokeWidth) paper.ctx.stroke();
			path = 'm -'+(dw||4)+',0 a '+(dw||4)+' '+(dw||4)+' 0 1 0 '+((dw||4)*2)+' 0 a '+(dw||4)+' '+(dw||4)+' 0 1 0 -'+((dw||4)*2)+' 0';
		}else if(shape=="square") path = "m-0.5,0.5 l 1,0 0,-1 -1,0 Z";
		else if(shape=="cross") path = "m-0.2,0.2 h -0.3 v -0.4 h 0.3 v -0.3 h 0.4 v 0.3 h 0.3 v 0.4 h-0.3 v 0.3 h -0.4Z";
		else if(shape=="diamond") path = 'm0,0.5l0.5,-0.5 -0.5,-0.5 -0.5,0.5 Z';
		else if(shape=="triangle-up" || shape=="triangle") path = 'm-0.5,0.4330127 l 1,0 -0.5,-0.8660254 Z';
		else if(shape=="triangle-down") path = 'm-0.5,-0.4330127 l 1,0 -0.5,0.8660254 Z';
		else if(shape=="triangle-right") path = 'm-0.4330127,0.5 l0,-1 0.8660254,0.5Z';
		else if(shape=="triangle-left") path = 'm0.4330127,0.5 l0,-1 -0.8660254,0.5Z';
		else if(shape=="arrow") path = 'm-0.1,0.5 l 0,-0.5 -0.15,0 0.25,-0.5 0.25,0.5 -0.15,0 0,0.5 Z';
		else if(shape=="wedge") path = 'm-0.25,0.4330127 l 0.5,0 -0.25,-0.8660254 Z';
		else if(shape=="stroke") path = 'm-0.5,0 l 1,0';
		else if(shape=="hexagram") path = 'm-0.1666667,0.2886751 l 0.1666667,0.2886751 0.1666667,-0.2886751 0.333333,0 -0.1666667,-0.2886751 0.1666667,-0.2886751 -0.333333,0 -0.1666667,-0.2886751 -0.1666667,0.2886751 -0.333333,0 0.1666667,0.2886751 -0.1666667,0.2886751 Z';
		else path = shape;
		path = (new Path(path));
		path.setOrigin(cx,cy);
		if(shape!="circle"){
			path.setSize(attr.size);
			path.draw(paper.ctx);
			if(shape!="stroke") paper.ctx.fill();
			if(attr.strokeWidth) paper.ctx.stroke();
		}
		if(attr.output == "texture") return paper.ctx.getImageData(0, 0, s2, s2);
		else if(attr.output == "svg") return path.svg(attr);
		else return paper.c;
	}

	root.WebGLGraph = WebGLGraph;

})(window || this);
