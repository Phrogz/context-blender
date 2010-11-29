## About

Adobe® Photoshop® has a variety of helpful [blend modes](http://help.adobe.com/en_US/Photoshop/11.0/WSfd1234e1c4b69f30ea53e41001031ab64-77e9a.html) for compositing images from multiple RGBA layers. This small library provides the same functionality for HTML Canvas Contexts, with the goal of producing the same results as Photoshop. _(This goal is not currently met. So far only a handful of modes have been implemented, with generally poor results so far. Only the 'screen' and 'add' modes are at all close to the output from Photoshop.)_

## Syntax

    overContext.blendOnto( underContext, blendMode, offsetOptions );
      - overContext   : A CanvasRenderingContext2D
      - underContext  : A CanvasRenderingContext2D
      - blendMode     : A string with the blend mode to use, e.g. 'screen'
      - offsetOptions : [optional] JS Object with some/all of the following keys:
          destX, destY
          The X/Y location in the 'underContext' to blend onto; both default to 0.
          
          sourceX, sourceY
          The X/Y location in the 'overContext' to blend from; both default to 0.
          
          width,height
          The size of the box to blend; both default to 'auto', blending up to the
          right and bottom edges of the 'over' context.
          
          Width and height may less than specified if there is not enough space
          on the over or under contexts to fit the blend.

## Use

		// Likely an 'offscreen' (not in the DOM) canvas
    var over = someCanvas.getContext('2d'); 
    
    // Usually a canvas that is shown on the page
    var under = anotherCanvas.getContext('2d');
    
    // Blend all of 'over' onto 'under', starting at the upper left corner
    over.blendOnto(under,'screen');
    
    // Blend all of 'over' onto 'under' (again), starting at 17,42 in 'under'
    over.blendOnto(under,'multiply',{destX:17,destY:42});
    
    // Blend a 16x16 tile from 'over' onto 'under' (again), starting at 17,42 in 'under'
    over.blendOnto(under,'add',{destX:17,destY:42,sourceX:32,sourceY:128,width:16,height:16});

## Supported Blend Modes

 * `normal` - Copy over onto under, respecting the alpha of both
 * `screen` 
 * `add`
 * `multiply`
 * `difference`
 * _more to come_

## Requirements/Browser Support

Only tested on Safari v5.0 and Chrome. Should work on any user agent that supplies a `CanvasRenderingContext2D`
along with `getImageData` and `putImageData`.


## About

This library was created around the need solely for a one-off 'screen' blend mode to match the company-mandated style for bar graphs used internally, previously only available via a Microsoft® Excel® template. Clearly this functionality is useful in more contexts than just my one-off, so I decided to make a framework around it and encourage others to help figure out the formulae. Please, fork this project, add blend modes and/or fix math, and send me pull requests! I feel certain that the resources must exist out there on the equations Photoshop uses in the presence of alpha, but so far I have not found them.

### License

This library is released under an MIT-style license. That generally means that you are free to do almost anything you want with it as long as you give a bit of credit where credit is due. See the LICENSE file included for the actual legal limitations.