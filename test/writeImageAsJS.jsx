app.bringToFront();
$.level = 0; // debug level: 0-2 (0:disable, 1:break on error, 2:break at beginning)

function getPixels32( doc ){
	var origRuler   = app.preferences.rulerUnits;
	var origDialogs = app.displayDialogs;
	app.preferences.rulerUnits = Units.PIXELS;
	app.displayDialogs = DialogModes.NO;

	var dup = doc.duplicate("tmpFlat",true);
	var w = dup.width.value;
	var h = dup.height.value;
	var rgba=[];

	var sampler = dup.colorSamplers.add( [UnitValue(0.5,"px"), UnitValue(0.5,"px")] );
	
	var px=0;
	for (var y=0;y<h;++y){
		for (var x=0;x<w;++x){
			sampler.move([UnitValue(x+0.5,"px"),UnitValue(y+0.5,"px")]);
			
			rgba[px  ] = 0;
			rgba[px+1] = 0;
			rgba[px+2] = 0;
			try{
				// The color sampler errors on fully-transparent pixels
				var rgb = sampler.color.rgb;
				rgba[px  ] = rgb.red.toFixed(2).replace('.00','');
				rgba[px+1] = rgb.green.toFixed(2).replace('.00','');
				rgba[px+2] = rgb.blue.toFixed(2).replace('.00','');
			}catch(e){}
			px += 4;
		}
	}

	var black = new SolidColor;
	black.rgb.red = black.rgb.green = black.rgb.blue = 0;
	dup.selection.selectAll();
	dup.selection.fill(black,ColorBlendMode.NORMAL,100,true);
	dup.flatten();

	var px=0;
	for (var y=0;y<h;++y){
		for (var x=0;x<w;++x){
			sampler.move([UnitValue(x+0.5,"px"),UnitValue(y+0.5,"px")]);
			rgba[px+3] = (255 - sampler.color.rgb.red).toFixed(2).replace('.00','');
			px += 4;
		}
	}
	sampler.remove();
	
	dup.close( SaveOptions.DONOTSAVECHANGES );
	app.preferences.rulerUnits  = origRuler;
	app.displayDialogs          = origDialogs;
	
	return {width:w, height:h,rgba:rgba};
}

var start = new Date;
var px = getPixels32( app.activeDocument );
var lap = new Date;
var readTime = (lap-start)/1000;

var outFile = "/C/photoshop_colors.js";
var output = new File(outFile);
output.open("w");
output.writeln("var img = {");
output.writeln("\twidth:"+px.width+",\n\theight:"+px.height+",");
output.writeln("\trgba:["+px.rgba.join(',')+"]");
output.writeln("};");
output.close();
var stop = new Date;
var writeTime = (stop-lap)/1000;

var msg = "Read "+px.width*px.height+"pixels in "+readTime.toFixed(1)+"s";
msg += "\nWrote to '"+outFile+"' in "+writeTime.toFixed(1)+"s";
alert( msg );
