(function(){

var defaultOffsets = {
	destX   : 0,
	destY   : 0,
	sourceX : 0,
	sourceY : 0,
	width   : 'auto',
	height  : 'auto'
};

if (typeof require==='function' && typeof module==='object'){
	var canvas = require('canvas');
	addBlendMethod(canvas.Context2d.prototype);
	module.exports = canvas;
} else addBlendMethod(this.CanvasRenderingContext2D && this.CanvasRenderingContext2D.prototype);

function addBlendMethod(object){
	if (!object || typeof object.getImageData!=='function') return console.error("context blender called without a valid context prototype");
	Object.defineProperty(object,'blendOnto',{value:blendOnto});

	// For querying of functionality from other libraries
	var modes = blendOnto.supportedBlendModes = 'normal src-over screen multiply difference src-in plus add overlay hardlight colordodge dodge colorburn burn darken darker lighten lighter exclusion softlight luminosity color hue saturation lightercolor darkercolor'.split(' ');
	var supports = blendOnto.supports = {};
	for (var i=modes.length;i--;) supports[modes[i]] = true;
	blendOnto.aliases = { "src-over":"normal", plus:"add", dodge:"colordodge", burn:"colorburn", darker:"darken", lighter:"lighten" };
	return object;
}

function blendOnto(destContext,blendMode,offsetOptions){
		var offsets={};
		for (var key in defaultOffsets){
			if (defaultOffsets.hasOwnProperty(key)){
				offsets[key] = (offsetOptions && offsetOptions[key]) || defaultOffsets[key];
			}
		}
		if (offsets.width =='auto') offsets.width =this.canvas.width;
		if (offsets.height=='auto') offsets.height=this.canvas.height;
		offsets.width  = Math.min(offsets.width, this.canvas.width-offsets.sourceX, destContext.canvas.width-offsets.destX );
		offsets.height = Math.min(offsets.height,this.canvas.height-offsets.sourceY,destContext.canvas.height-offsets.destY);

		var srcD = this.getImageData(offsets.sourceX,offsets.sourceY,offsets.width,offsets.height);
		var dstD = destContext.getImageData(offsets.destX,offsets.destY,offsets.width,offsets.height);
		var src  = srcD.data;
		var dst  = dstD.data;
		var sA, dA, len=dst.length;
		var sRA, sGA, sBA, dRA, dGA, dBA, dA2,
		    r1,g1,b1, r2,g2,b2;
		var demultiply;

		function Fsoftlight(a,b) {
			/*
				http://en.wikipedia.org/wiki/Blend_modes#Soft_Light
				2ab+a^2 (1-2b), if b<0.5
				2a(1-b) +sqrt(a)(2b-1), otherwise
			*/
			var b2=b<<1;
			if (b<128) return (a*(b2+(a*(255-b2)>>8)))>>8;
			else       return (a*(511-b2)+(Math.sqrt(a<<8)*(b2-255)))>>8;
		}

		function Foverlay(a,b) {
			return a<128 ?
				(a*b)>>7 : // (2*a*b)>>8 :
				255 - (( (255 - b) * (255 - a))>>7);
		}

		function Fdodge(a,b) {
			return (b==255 && a==0) ? 255 : Math.min(255,(a<<8)/(255-b));
		}

		function Fburn(a,b) {
			return (b==255 && a==0) ? 0 : 255-Math.min(255,((255-a)<<8)/b);
		}


		/*
			// yyy = similar to YCbCr
			0.2990    0.5870    0.1140
			-0.1687   -0.3313    0.5000
			0.5000   -0.4187   -0.0813
		*/
		function rgb2YCbCr(r,g,b) {
			return {
				r: 0.2990*r+0.5870*g+0.1140*b,
				g: -0.1687*r-0.3313*g+0.5000*b,
				b: 0.5000*r-0.4187*g-0.0813*b };
		}

		/*
			1.0000   -0.0000    1.4020
			1.0000   -0.3441   -0.7141
			1.0000    1.7720    0.0000
		*/
		function YCbCr2rgb(r,g,b) {
			return {
				r: r +1.4020*b,
				g: r-0.3441*g   -0.7141*b,
				b: r+1.7720*g };
		}

		function rgb2hsv(r,g,b) {
			var c=rgb2YCbCr(r,g,b);
			var s=Math.sqrt(c.g*c.g+c.b*c.b),
			    h=Math.atan2(c.g,c.b);
			return {h:h, s:s, v:c.r };
		}

		function hsv2rgb(h,s,v) {
			var g=s*Math.sin(h),
			    b=s*Math.cos(h);
			return YCbCr2rgb(v,g,b);
		}


		for (var px=0;px<len;px+=4){
			sA  = src[px+3]/255;
			dA  = dst[px+3]/255;
			dA2 = (sA + dA - sA*dA);
			dst[px+3] = dA2*255;

			r1=dst[px], g1=dst[px+1], b1=dst[px+2];
			r2=src[px], g2=src[px+1], b2=src[px+2];

			sRA = r2/255*sA;
			dRA = r1/255*dA;
			sGA = g2/255*sA;
			dGA = g1/255*dA;
			sBA = b2/255*sA;
			dBA = b1/255*dA;

			demultiply = 255 / dA2;

			var f1=dA*sA, f2=dA-f1, f3=sA-f1;

			switch(blendMode){
				// ******* Very close match to Photoshop
				case 'normal':
				case 'src-over':
					dst[px  ] = (sRA + dRA - dRA*sA) * demultiply;
					dst[px+1] = (sGA + dGA - dGA*sA) * demultiply;
					dst[px+2] = (sBA + dBA - dBA*sA) * demultiply;
				break;

				case 'screen':
					dst[px  ] = (sRA + dRA - sRA*dRA) * demultiply;
					dst[px+1] = (sGA + dGA - sGA*dGA) * demultiply;
					dst[px+2] = (sBA + dBA - sBA*dBA) * demultiply;
				break;

				case 'multiply':
					dst[px  ] = (sRA*dRA + sRA*(1-dA) + dRA*(1-sA)) * demultiply;
					dst[px+1] = (sGA*dGA + sGA*(1-dA) + dGA*(1-sA)) * demultiply;
					dst[px+2] = (sBA*dBA + sBA*(1-dA) + dBA*(1-sA)) * demultiply;
				break;

				case 'difference':
					dst[px  ] = (sRA + dRA - 2 * Math.min( sRA*dA, dRA*sA )) * demultiply;
					dst[px+1] = (sGA + dGA - 2 * Math.min( sGA*dA, dGA*sA )) * demultiply;
					dst[px+2] = (sBA + dBA - 2 * Math.min( sBA*dA, dBA*sA )) * demultiply;
				break;

				// ******* Slightly different from Photoshop, where alpha is concerned
				case 'src-in':
					dA2 = sA*dA;
					demultiply = 255 / dA2;
					dst[px  ] = sRA*dA * demultiply;
					dst[px+1] = sGA*dA * demultiply;
					dst[px+2] = sBA*dA * demultiply;
					dst[px+3] = dA2*255;
				break;

				case 'plus':
				case 'add':
					// Photoshop doesn't simply add the alpha channels; this might be correct wrt SVG 1.2
					dst[px  ] = Math.min(sRA + dRA,1) * demultiply;
					dst[px+1] = Math.min(sGA + dGA,1) * demultiply;
					dst[px+2] = Math.min(sBA + dBA,1) * demultiply;
				break;

				case 'overlay':
					dst[px]   = f1*Foverlay(r1,r2) + f2*r1 + f3*r2;
					dst[px+1] = f1*Foverlay(g1,g2) + f2*g1 + f3*g2;
					dst[px+2] = f1*Foverlay(b1,b2) + f2*b1 + f3*b2;
				break;

				case 'hardlight': // hardlight(a,b) = overlay(b,a)
					dst[px]   = f1*Foverlay(r2,r1) + f2*r1 + f3*r2;
					dst[px+1] = f1*Foverlay(g2,g1) + f2*g1 + f3*g2;
					dst[px+2] = f1*Foverlay(b2,b1) + f2*b1 + f3*b2;
				break;

				case 'colordodge':
				case 'dodge':
					dst[px]   = f1*Fdodge(r1,r2) + f2*r1 + f3*r2;
					dst[px+1] = f1*Fdodge(g1,g2) + f2*g1 + f3*g2;
					dst[px+2] = f1*Fdodge(b1,b2) + f2*b1 + f3*b2;
				break;

				case 'colorburn':
				case 'burn':
					dst[px]   = f1*Fburn(r1,r2) + f2*r1 + f3*r2;
					dst[px+1] = f1*Fburn(g1,g2) + f2*g1 + f3*g2;
					dst[px+2] = f1*Fburn(b1,b2) + f2*b1 + f3*b2;
				break;

				case 'darken':
				case 'darker':
					dst[px]   = f1*(r1<r2 ? r1 : r2) + f2*r1 + f3*r2;
					dst[px+1] = f1*(g1<g2 ? g1 : g2) + f2*g1 + f3*g2;
					dst[px+2] = f1*(b1<b2 ? b1 : b2) + f2*b1 + f3*b2;
				break;

				case 'lighten':
				case 'lighter':
					dst[px  ] = (sRA<dRA ? dRA : sRA) * demultiply;
					dst[px+1] = (sGA<dGA ? dGA : sGA) * demultiply;
					dst[px+2] = (sBA<dBA ? dBA : sBA) * demultiply;
				break;

				case 'exclusion':
					dst[px  ] = (dRA+sRA - 2*dRA*sRA) * demultiply;
					dst[px+1] = (dGA+sGA - 2*dGA*sGA) * demultiply;
					dst[px+2] = (dBA+sBA - 2*dBA*sBA) * demultiply;
				break;

				case 'softlight':
					dst[px]   = f1*Fsoftlight(r1,r2) + f2*r1 + f3*r2;
					dst[px+1] = f1*Fsoftlight(g1,g2) + f2*g1 + f3*g2;
					dst[px+2] = f1*Fsoftlight(b1,b2) + f2*b1 + f3*b2;
				break;

				case 'luminosity':
					var hsl  = rgb2YCbCr(r1,g1,b1);
					var hsl2 = rgb2YCbCr(r2,g2,b2);
					var rgb=YCbCr2rgb(hsl2.r, hsl.g, hsl.b);
					dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
					dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
					dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
				break;

				case 'color':
					var hsl  = rgb2YCbCr(r1,g1,b1);
					var hsl2 = rgb2YCbCr(r2,g2,b2);
					var rgb=YCbCr2rgb(hsl.r, hsl2.g, hsl2.b);
					dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
					dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
					dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
				break;

				case 'hue':
					var hsl =rgb2hsv(r1,g1,b1);
					var hsl2=rgb2hsv(r2,g2,b2);
					var rgb=hsv2rgb(hsl2.h, hsl.s, hsl.v);
					dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
					dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
					dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
				break;

				case 'saturation':
					var hsl =rgb2hsv(r1,g1,b1);
					var hsl2=rgb2hsv(r2,g2,b2);
					var rgb=hsv2rgb(hsl.h, hsl2.s, hsl.v);
					dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
					dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
					dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
				break;

				case 'lightercolor':
					var rgb = 2.623*(r1-r2)+5.15*(g1-g2)+b1-b2>0 ? {r:r1,g:g1,b:b1} : {r:r2,g:g2,b:b2};
					dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
					dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
					dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
				break;

				case 'darkercolor':
					var rgb = 2.623*(r1-r2)+5.15*(g1-g2)+b1-b2<0 ? {r:r1,g:g1,b:b1} : {r:r2,g:g2,b:b2};
					dst[px]   = f1*rgb.r + f2*r1 + f3*r2;
					dst[px+1] = f1*rgb.g + f2*g1 + f3*g2;
					dst[px+2] = f1*rgb.b + f2*b1 + f3*b2;
				break;

				default: // ******* UNSUPPORTED mode, produces yellow/magenta checkerboard
					var col = (px/4) % this.canvas.width,
					    row = Math.floor((px/4) / this.canvas.width),
					    odd = (col%8<4 && row%8<4) || (col%8>3 && row%8>3);
					dst[px] = dst[px+3] = 255;
					dst[px+1] = odd ? 255 : 0;
					dst[px+2] = odd ? 0 : 255;
			}
		}
		destContext.putImageData(dstD,offsets.destX,offsets.destY);
}

})();