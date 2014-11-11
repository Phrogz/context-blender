// Automatically test the correctness and performance of all blend modes.
// The script requires node.js with node-canvas installed.
var Canvas = require(__dirname+'/../context_blender'),
    Image  = Canvas.Image,
    fs     = require('fs');
var ctx = {};
var blendModes   = Canvas.Context2d.prototype.blendOnto.supportedBlendModes, 
    blendAliases = Canvas.Context2d.prototype.blendOnto.aliases;

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
	drawOntoContext(ctx.ideal, __dirname+'/'+mode+'-ideal.png');
	var ideal = ctx.ideal.getImageData(0,0,140,140).data;

	for (var time=0,i=100;i--;){
		ctx.actual.clearRect(0,0,140,140);
		drawOntoContext(ctx.actual, __dirname+'/under.png');
		var start = new Date;
		ctx.over.blendOnto(ctx.actual,mode);
		time += new Date-start;
	}
	writeContextToFile(ctx.actual,__dirname+'/'+mode+'-actual.png');
	var actual = ctx.actual.getImageData(0,0,140,140).data;

	for (var delta=0,i=0;i<actual.length;i+=4) delta += diff(pxl(actual,i),pxl(ideal,i));
	return { mode:mode, time:time, delta:delta };
}

function diff(px1,px2){
	var deltas = [Math.abs(px1.r-px2.r), Math.abs(px1.g-px2.g), Math.abs(px1.b-px2.b), Math.abs(px1.a-px2.a)];
	for (var delta=0,i=0;i<4;++i) delta+=deltas[i];
	return delta;
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
		new Buffer(context.canvas.toDataURL().split(',')[1], 'base64')
	);
}

function writeResults(results){
	var baseTime = results.normal.time;
	var lines = [];
	for (var i=0;i<blendModes.length;++i){
		var mode = blendModes[i];
		if (!blendAliases[mode]){
			var result = results[mode];
			lines.push( "Mode: "+result.mode.pad(12)+"Time: "+(result.time/baseTime).toFixed(2)+"  Delta:"+(result.delta+"").pad(9,true) );
		}
	}
	fs.writeFileSync(__dirname+'/results.txt',lines.join("\n"));
}

Object.defineProperty(String.prototype,'pad',{value:function(chars,rightAligned,char){
	var padding = new Array(chars+1).join(char||" ");
	return rightAligned ? (padding+this).slice(-chars) : (this+padding).slice(0,chars);
}});

go();