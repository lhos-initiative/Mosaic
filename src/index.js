import { m, TemplateTable } from "./templating/m";
import { Observable } from './observable';
import { isHTMLElement, findInvalidOptions, getDOMfromID } from './validations';
import { viewToDOM, randomKey, traverse, traverseTwo, walk } from './util';
import { nodeMarker } from "./templating/utilities";
import { TemplateInstance } from "./templating/templateInstance";

/** The configuration options for a Mosaic component.
 * @typedef {MosaicOptions} MosaicOptions Configuration options for a Mosaic component.
 * @param {HTMLElement} element The DOM element to inject this component into.
 * @param {Object} data The data of this component.
 * @param {Function | String} view The view to define the appearance of this component.
 * @param {Function} created Called when this component is created.
 * @param {Function} willUpdate Called when this component is about to update.
 * @param {Function} updated Called when this component has been updated.
 * @param {Function} willDestroy Called when this component is about to be destroyed.
*/
const MosaicOptions = {
    /** The HTML element to inject this Mosaic component into. */
    element: HTMLElement,

    /** The state of this component. */
    data: Object,

    /** The view that will be rendered on the screen. */
    view: Function,

    /** The actions that can be used on this Mosaic component. */
    actions: Object,

    /** The function to run when this component is created and injected into the DOM. */
    created: Function,

    /** The function to run when this component is about to update its data. */
    willUpdate: Function,

    /** The function to run after this component has been updated. */
    updated: Function,

    /** The function that runs just before this component gets removed from the DOM. */
    willDestroy: Function
};


/** Creates a new Mosaic component with configuration options.
* @param {MosaicOptions} options The configuration options for this Mosaic. */
const Mosaic = function(options) {
    let invalids = findInvalidOptions(options);
    if(invalids !== undefined) throw new Error(invalids);

    this.tid = options.tid || randomKey();
    this.element = typeof options.element === 'string' ? getDOMfromID(options.element) : options.element;
    this.router = options.router;
    this.view = options.view;
    this.created = options.created;
    this.willUpdate = options.willUpdate;
    this.updated = options.updated;
    this.willDestroy = options.willDestroy;

    // Make each array a proxy of its own then etup the data observer.
    let _tempData = makeArraysObservable.call(this, options.data);
    this.data = new Observable(_tempData || {}, (oldData) => {
        if(this.willUpdate) this.willUpdate(oldData);
    }, () => {
        updateMosaic.call(this);
        if(this.updated) this.updated(this.data, this.actions);
    });

    this.actions = options.actions;
    this.options = Object.assign({}, options);
    this.__isMosaic = true;

    // Create the template for this component and find the dynamic "parts."
    const view = this.view(this.data, this.actions);
    TemplateTable[this.tid] = {
        parts: view.parts,
        template: view.element,
        values: view.values[0]
    }
    console.log(TemplateTable);


    return this;
}

/** "Paints" the Mosaic onto the page by injecting it into its base element. */
Mosaic.prototype.paint = function() {
    if(!this.element || !isHTMLElement(this.element)) {
        throw new Error(`This Mosaic could not be painted because its element property is either not set
        or is not a valid HTML element.`);
    }
    
    // Clear anything that is there.
    while(this.element.firstChild) this.element.removeChild(this.element.firstChild);

    // Create a brand new DOM element from the template. This will basically be
    // a new instance of this Mosaic.
    let templateResult = TemplateTable[this.tid];
    let clonedElement = document.importNode(templateResult.template.content.childNodes[0], true);
    let partIndex = 0;
    for(let part of templateResult.parts) {
        if(part.type === 'node') {
            let dynamicNodes = clonedElement.querySelectorAll(`[__mosaicKey__='${part.__mosaicKey__}']`);
            dynamicNodes.forEach(node => {
                let value = templateResult.values[partIndex++];
                node.childNodes[0].replaceWith(value);
            });
        }
        else if(part.type === 'attribute') {
            let attrName = part.attributeName;
            let dynamicAttributeNodes = clonedElement.querySelectorAll(`*[${attrName}]`);
            dynamicAttributeNodes.forEach(node => {
                node.setAttribute(attrName, templateResult.values[partIndex++]);
            });
        }
    }
    
    // Now take that cloned element that has all of its nodes and attributes
    // set and inject it into the DOM. When you "paint" it's ok to just replace
    // because you know that this is the first and only time you are using this
    // component, and that if you are painting it you can be sure that it will
    // have the "element" property set to an existing DOM node.
    this.element.replaceWith(clonedElement);

    // Call the created lifecycle function.
    if(this.created) this.created(this.data, this.actions);
}

/** Checks if two Mosaics are equal to each other. 
* @param {Mosaic} other Whether or not this Mosaic is equal to another. */
Mosaic.prototype.equals = function(other) {
    return (this.templateID === other.templateID) && (this.instanceID === other.instanceID);
}


/*
* ------------- HELPERS -------------- 
*/

const makeArraysObservable = (data) => {
    let _tempData = data;
    for(var i in _tempData) {
        if(!Array.isArray(_tempData[i])) continue;
        
        _tempData[i] = new Observable(_tempData[i], () => {
            if(this.willUpdate) this.willUpdate(oldData);
        }, () => {
            updateMosaic.call(this);
            if(this.updated) this.updated();
        });
    }
    return _tempData;
}

/** Handles the updating/diffing part of the render. */
const updateMosaic = function() {
    
}


window.html = m;
window.Mosaic = Mosaic;
export default Mosaic;