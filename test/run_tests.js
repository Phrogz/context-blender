// Automatically test the correctness and performance of all blend modes.
// The script requires node.js with node-canvas installed.
var Canvas  = require(__dirname+'/../context_blender'),
    Image   = Canvas.Image,
    sprintf = require('sprintf').sprintf,
    fs      = require('fs');

var ctx = {};
var blendModes   = Canvas.Context2d.prototype.blendOnto.supportedBlendModes,
    blendAliases = Canvas.Context2d.prototype.blendOnto.aliases;

var testLoops = 10;

function go(){
	for (var a='over under actual ideal'.split(' '),i=4;i--;) ctx[a[i]] = new Canvas(140,140).getContext('2d');
	drawOntoContext(ctx.over,  __dirname+'/over.png' );
	drawOntoContext(ctx.under, __dirname+'/under.png');

	for (var results={},i=blendModes.length;i--;){
		var mode = blendModes[i];
		if (!blendAliases[mode]) results[mode] = analyze(mode);
	}
	writeResults(results);
}

function analyze(mode){
	ctx.ideal.clearRect(0,0,140,140);
	drawOntoContext(ctx.ideal, __dirname+'/'+mode+'-ideal.png');
	var ideal = ctx.ideal.getImageData(0,0,140,140).data;

	for (var time=0,i=testLoops;i--;){
		ctx.actual.clearRect(0,0,140,140);
		ctx.actual.drawImage(ctx.under.canvas,0,0);
		var start = new Date;
		ctx.over.blendOnto(ctx.actual,mode);
		time += new Date-start;
	}
	writeContextToFile(ctx.actual,__dirname+'/'+mode+'-actual.png');
	var actual = ctx.actual.getImageData(0,0,140,140).data;

	for (var deltas=[],i=0;i<actual.length;i+=4) deltas[i] = distance(pxl(ideal,i),pxl(actual,i));
	return { mode:mode, time:time/testLoops, deltas:deltas };
}

function distance(ideal,actual){
	return Math.sqrt( Math.pow(ideal.r-actual.r,2) + Math.pow(ideal.g-actual.g,2) + Math.pow(ideal.b-actual.b,2) + Math.pow(ideal.a-actual.a,2) ) * (ideal.a/255);
}

function pxl(imgdata,i){
	return {r:imgdata[i],g:imgdata[i+1],b:imgdata[i+2],a:imgdata[i+3]};
}

function drawOntoContext(context,filename){
	var img = new Image;
	img.src = fs.readFileSync(filename);
	context.drawImage(img,0,0,img.width,img.height);
}

function writeContextToFile(context,filename) {
	fs.writeFileSync(
		filename,
		new Buffer( context.canvas.toDataURL().split(',')[1], 'base64' )
	);
}

function writeResults(results){
	var lines = [];
	for (var i=0;i<blendModes.length;++i){
		var mode = blendModes[i];
		if (!blendAliases[mode]){
			var result  = results[mode];
			var wrongs  = result.deltas.filter(function(n){ return n>3 });
			var percent = 100 * wrongs.length / Math.pow(140,2);
			var delta   = wrongs.sum();
			lines.push( sprintf("%-12s   wrong:%3d%%   delta:%8d   time:%5.1fms", result.mode, percent, delta, result.time ) );
		}
	}
	fs.writeFileSync(__dirname+'/results.txt',lines.join("\n"));
}

Object.defineProperty(Array.prototype,'sum',{value:function(){ for (var sum=0,i=this.length;i--;) sum+=this[i]; return sum }});
Object.defineProperty(Array.prototype,'avg',{value:function(){ return this.sum()/this.length }});
Object.defineProperty(Array.prototype,'stddev',{value:function(){ for (var avg=this.avg(),sum=0,i=this.length;i--;) sum+=Math.pow(this[i]-avg,2); return Math.sqrt(sum/this.length) }});

go();