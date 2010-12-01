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
		
		switch(blendMode){
			case 'normal':
				for (var px=0;px<len;px+=4){
					sA = src[px+3]/255;
					dA = dst[px+3]/255;
					dst[px+3] = (sA+dA)*255;
					dst[px  ] = (1 - sA)*dst[px  ] + src[px  ];
					dst[px+1] = (1 - sA)*dst[px+1] + src[px+1];
					dst[px+2] = (1 - sA)*dst[px+2] + src[px+2];
				}
			break;
			case 'screen':
				for (var px=0;px<len;px+=4){
					sA  = src[px+3]/255;
					dA  = dst[px+3]/255;
					dA2 = (sA + dA - sA*dA);
					dst[px+3] = dA2*255;

					sA /= 255; dA /= 255;
					sRA = src[px  ]*sA;
					dRA = dst[px  ]*dA;
					sGA = src[px+1]*sA;
					dGA = dst[px+1]*dA;
					sBA = src[px+2]*sA;
					dBA = dst[px+2]*dA;
					
					dst[px  ] = 255 * (sRA + dRA - sRA*dRA ) / dA2;
					dst[px+1] = 255 * (sGA + dGA - sGA*dGA ) / dA2;
					dst[px+2] = 255 * (sBA + dBA - sBA*dBA ) / dA2;
				}
			break;
			case 'add':
				for (var px=0;px<len;px+=4){
					sA = src[px+3]/255;
					dA = dst[px+3]/255;
					dst[px+3] = (sA + dA*(1-sA))*255;
					dst[px  ] = src[px  ]*sA+dst[px  ]*dA;
					dst[px+1] = src[px+1]*sA+dst[px+1]*dA;
					dst[px+2] = src[px+2]*sA+dst[px+2]*dA;
				}
			break;
			case 'multiply':
				for (var px=0;px<len;px+=4){
					sA = src[px+3]/255;
					dA = dst[px+3]/255;
					dst[px+3] = (sA+dA-sA*dA)*255;
					dst[px  ] = src[px  ]*sA*dst[px  ]*dA;
					dst[px+1] = src[px+1]*sA+dst[px+1]*dA;
					dst[px+2] = src[px+2]*sA+dst[px+2]*dA;
				}
			break;
			case 'difference':
				for (var px=0;px<len;px+=4){
					sA = src[px+3]/255;
					dA = dst[px+3]/255;
					dst[px+3] = (sA + dA*(1-sA))*255;
					dst[px  ] = (src[px  ]>dst[px  ]) ? (src[px  ]-dst[px  ]) : (dst[px  ]-src[px  ]);
					dst[px+1] = (src[px+1]>dst[px+1]) ? (src[px+1]-dst[px+1]) : (dst[px+1]-src[px+1]);
					dst[px+2] = (src[px+2]>dst[px+2]) ? (src[px+2]-dst[px+2]) : (dst[px+2]-src[px+2]);
				}
			break;
			default:
				// Unsupported blend mode
				for (var px=0;px<len;px+=4){
					dst[px] = dst[px+3] = 255;
					dst[px+1] = px%8==0 ? 255 : 0;
					dst[px+2] = px%8==0 ? 0 : 255;
				}
		}
		dstD.data = dst;
		destContext.putImageData(dstD,offsets.destX,offsets.destY);
	};
}