if (window.CanvasRenderingContext2D){
	var defaultOffsets = {
		destX   : 0,
		destY   : 0,
		sourceX : 0,
		sourceY : 0,
		width   : 'auto',
		height  : 'auto'
	};
	CanvasRenderingContext2D.prototype.blendOnto = function(destContext,blendMode,offsetOptions){
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
		var sRA, sGA, sBA, dRA, dGA, dBA, dA2;
		var demultiply;

		for (var px=0;px<len;px+=4){
			sA  = src[px+3]/255;
			dA  = dst[px+3]/255;
			dA2 = (sA + dA - sA*dA);
			dst[px+3] = dA2*255;

			sRA = src[px  ]/255*sA;
			dRA = dst[px  ]/255*dA;
			sGA = src[px+1]/255*sA;
			dGA = dst[px+1]/255*dA;
			sBA = src[px+2]/255*sA;
			dBA = dst[px+2]/255*dA;
			
			demultiply = 255 / dA2;
		
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
				
				// ******* Slightly different from Photoshop
				case 'src-in':
					// Only differs from Photoshop in low-opacity areas
					dA2 = sA*dA;
					demultiply = 255 / dA2;
					dst[px+3] = dA2*255;
					dst[px  ] = sRA*dA * demultiply;
					dst[px+1] = sGA*dA * demultiply;
					dst[px+2] = sBA*dA * demultiply;
				break;

				case 'plus':
				case 'add':
					// Photoshop doesn't simply add the alpha channels; this might be correct wrt SVG 1.2
					dA2 = Math.min(1,sA+dA);
					dst[px+3] = dA2*255;
					demultiply = 255 / dA2;
					dst[px  ] = Math.min(sRA + dRA,1) * demultiply;
					dst[px+1] = Math.min(sGA + dGA,1) * demultiply;
					dst[px+2] = Math.min(sBA + dBA,1) * demultiply;
				break;

				// ******* BROKEN
				case 'overlay':
					dst[px  ] = ((2*dRA<dA) ? (2*sRA*dRA + sRA*(1-dA) + dRA*(1-sA)) : (sRA*dRA - 2*(dA-dRA)*(sA-sRA) + sRA*(1-dA) + dRA*(1-sA)) ) * demultiply;
					dst[px+1] = ((2*dGA<dA) ? (2*sGA*dGA + sGA*(1-dA) + dGA*(1-sA)) : (sGA*dGA - 2*(dA-dGA)*(sA-sGA) + sGA*(1-dA) + dGA*(1-sA)) ) * demultiply;
					dst[px+2] = ((2*dBA<dA) ? (2*sBA*dBA + sBA*(1-dA) + dBA*(1-sA)) : (sBA*dBA - 2*(dA-dBA)*(sA-sBA) + sBA*(1-dA) + dBA*(1-sA)) ) * demultiply;
				break;

				case 'colordodge':
				case 'dodge':
					if (src[px  ]==255 && dRA==0) dst[px  ] = sRA*(1-dA) * demultiply;
					else if (src[px  ]==255)      dst[px  ] = (sA*dA + sRA*(1-dA) + dRA*(1-sA)) * demultiply;           
					else if (sRA<sA)              dst[px  ] = Math.min( sA*dA, dRA*sA/(sA*dA - sRA*dA)) * demultiply;

					if (src[px+1]==255 && dGA==0) dst[px+1] = sGA*(1-dA) * demultiply;
					else if (src[px+1]==255)      dst[px+1] = (sA*dA + sGA*(1-dA) + dGA*(1-sA)) * demultiply;           
					else if (sGA<sA)              dst[px+1] = Math.min( sA*dA, dGA*sA/(sA*dA - sGA*dA)) * demultiply;

					if (src[px+2]==255 && dBA==0) dst[px+2] = sBA*(1-dA) * demultiply;
					else if (src[px+2]==255)      dst[px+2] = (sA*dA + sBA*(1-dA) + dBA*(1-sA)) * demultiply;           
					else if (sBA<sA)              dst[px+2] = Math.min( sA*dA, dBA*sA/(sA*dA - sBA*dA)) * demultiply;
				break;

				// ******* UNSUPPORTED
				default:
					dst[px] = dst[px+3] = 255;
					dst[px+1] = px%8==0 ? 255 : 0;
					dst[px+2] = px%8==0 ? 0 : 255;
			}
		}
		destContext.putImageData(dstD,offsets.destX,offsets.destY);
	};
}