import { MosaicOptions } from "./mosaic-options";
import { findInvalidOptions } from "./validations";
import { randomKey, getDOMfromID, isHTMLElement, traverseValues } from "./util";
import { Observable } from "./observable";
import { Template } from "./template";

/** A table for the templates and instances. */
const TemplateTable = {};

/** The equivalent of the 'html' tagged function. */
const m = (strings, ...values) => new Template(strings, values);

class Mosaic {
    tid: string
    element: string|HTMLElement|null
    data?: Object
    actions?: Object
    view: Function
    created?: Function
    willUpdate?: Function
    updated?: Function
    willDestroy?: Function

    options: {}
    values: any[]
    injected?: Object
    private base: Element|HTMLElement|ChildNode|Node|null = null
    private __isMosaic: boolean

    /** Creates a new Mosaic component with configuration options.
    * @param {MosaicOptions} options The configuration options for this Mosaic. */
    constructor(options: MosaicOptions) {
        let invalids = findInvalidOptions(options);
        if(invalids) throw new Error(invalids);

        this.tid = options.tid || randomKey();
        this.element = typeof options.element === 'string' ? getDOMfromID(options.element) : options.element;
        this.view = options.view;
        this.actions = options.actions;
        this.created = options.created;
        this.willUpdate = options.willUpdate;
        this.updated = options.updated;
        this.willDestroy = options.willDestroy;

        // Make each array a proxy of its own then etup the data observer.
        let _data = attachArrayProxy.call(this);
        this.data = attachDataProxy.call(this, _data);

        // Set some additional helper options.
        this.options = Object.assign({}, options);
        this.__isMosaic = true;

        // Create the Template, set the Parts on this Mosaic, and set the element
        // on this Mosaic. Parts will be updated when we create instances with new.
        // - By deleting the Mosaics that exist in the Template at initialization,
        // you can ensure that the diffing algo in Memory does not need to have an
        // extra edge case, yet also does not mistakenly update Mosaics.
        let template = this.view(this.data, this.actions);
        this.values = template.values.slice();
        this.values.forEach((val, index) => {
            if(typeof val === 'object' && val.__isMosaic) this.values[index] = undefined;
            else if(typeof val === 'number') this.values[index] = ''+val;
        });

        if(!(this.tid in TemplateTable)) {
            delete template.values; // Delete the values from the Template cause it doesn't really need them. Maybe remove later.
            TemplateTable[this.tid] = template;
        }

        // Set the element property on this Mosaic to a clone of the template.
        let cloned = template.element.content.cloneNode(true).firstChild;
        if(!document.contains(this.element)) {
            this.element = cloned;
        } else {
            this.base = typeof options.element === 'string' ? getDOMfromID(options.element) : options.element;
            this.element = cloned;
        }

        return this;
    }


    /** "Paints" the Mosaic onto the page by injecting it into its base element. */
    paint() {
        if(!this.base || !isHTMLElement(this.base)) {
            throw new Error(`This Mosaic could not be painted because its element property is either not set
            or is not a valid HTML element.`);
        }
        while(this.base.firstChild) this.base.removeChild(this.base.firstChild);
    
        // Create a new version of this base Mosaic. This will also cause it to
        // be repainted with the placeholders filled in.
        let instance = this.new();
        instance.base.replaceWith(instance.element);
    
        // Call the created lifecycle function.
        traverseValues(instance, (mosaic, last) => {
            if(mosaic.created) mosaic.created();
        });
    }

    
    /** Forces an update (repaint of the DOM) on this component. */
    repaint() {

    }

}





/*
* ------------- HELPERS -------------- 
*/

/** Makes array methods observable. */
const attachArrayProxy = function() {
    let _tempData = this.data;
    for(var i in _tempData) {
        if(!Array.isArray(_tempData[i])) continue;
        
        _tempData[i] = new Observable(_tempData[i], (oldData) => {
            if(!this.iid) return; // Only update the instances, not the diagrams.
            if(this.willUpdate) this.willUpdate(oldData);
        }, () => {
            if(!this.iid) return; // Only update the instances, not the diagrams.
            this.repaint();
            if(this.updated) this.updated();
        });
    }
    return _tempData;
}

/** Makes regular object properties observable. */
const attachDataProxy = function(_data) {
    let ret = new Observable(_data, (old) => {
        if(!this.iid) return; // Only update the instances, not the diagrams.
        if(this.willUpdate) this.willUpdate(old);
    }, () => {
        if(!this.iid) return; // Only update the instances, not the diagrams.
        this.repaint();
        if(this.updated) this.updated();
    })
    return ret;
}

export default Mosaic;