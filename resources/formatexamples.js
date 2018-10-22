S(document).ready(function(){

	// Format examples nicely to show how they were done
	var examples = S('.example');
	function tidy(t){ return t.replace(/===NEWLINE===/g,"\n").replace(/\n*$/,"").replace(/^\n*/,""); }
	function sanitise(t){ return t.replace(/\</g,"&lt;").replace(/\>/g,"&gt;"); }
	function deindent(t){ var indent = ""; t.replace(/^([\s\t]+)/,function(m,p1,p2){ indent = m; }); return t.replace(new RegExp(indent,'g'),"").replace(/[\s\t]+$/,""); }


	function highlight(el){
		var els = S(examples[el]).find('.prettyprint');
		for(var i = 0; i < els.length; i++) hljs.highlightBlock(els[i]);
	}

	for(var i = 0; i < examples.length; i++){
		html = examples[i].innerHTML;
		css = "";
		js = "";
		json = "";
		temp = html.replace(/\n/g,"===NEWLINE===").replace(/<!-- HTML -->/i,"");
		temp = temp.replace(/<!-- Javascript -->/i,"").replace(/<script>(.*)<\/script>/,function(m,p1){
			js = js+tidy(p1);
			return "";
		})
		
		temp = temp.replace(/<!-- CSS -->/i,"").replace(/<style>(.*)<\/style>/,function(m,p1){
			css = tidy(p1);
			return "";
		});
	
		code = sanitise(tidy(temp));
		code = code.replace(/(src|href)=\"([^\"]+)\"/g,function(m,p1,p2){ return p1+'="<a href="'+p2+'">'+p2+'</a>"'; });
		
		showtitle = true;
		if(S(examples[i]).attr('data-title')=="false") showtitle = false;

		// Append the 'How to do it' content
		S(examples[i]).append((showtitle ? '<h3>How to do it</h3><h4>HTML</h4>':'')+'<pre class="prettyprint lang-html">'+deindent(code)+'</pre>'+(css ? (showtitle ? '<h4>CSS</h4>':'')+'<pre class="prettyprint lang-css">'+deindent(sanitise(css))+'</pre>':'')+(js ? (showtitle ? '<h4>Javascript</h4>':'')+'<pre class="prettyprint lang-js">'+deindent(sanitise(js))+'</pre>':''))

		match = js.match(/[\"\']([^\"\']*\.json)[\"\']/);
		if(match && match.length == 2 && match[1].indexOf(/schema/) < 0){
			S().ajax(match[1],{
				'i': i,
				'file':match[1],
				'success': function(d,attr){
					S(examples[attr.i]).append('<h4>JSON - '+attr.file+'</h4><pre class="prettyprint lang-js">'+d+'</pre>')
					highlight(attr.i);
				}
			});
		}else{
			highlight(i);
		}
	}

	// Update anchor now that we've updated the page		
	if(location.hash) document.location = location.hash;

});