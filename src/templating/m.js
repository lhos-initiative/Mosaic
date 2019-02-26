import { marker, nodeMarker, boundAttributeSuffix, lastAttributeNameRegex } from './utilities';

/**
* ------------- TABLES -------------
*/

/** The template table. */
export const TemplateTable = {};

/** The instance table. */
export const InstanceTable = {};

/** The change table. */
export const ChangeTable = {};


/**
* ------------- PARTS -------------
*/

/** A "Part" represents a place in the DOM that is likely to change (i.e. a dynamic node).
* It keeps track of the DOM node that holds the dynamic part, a template for what that node
* should look like, and the actual representation of that node at any given time. */
export const Part = function(templateNode, dynamicPartIndex) {
    this.templateNode = templateNode;
    this.dynamicPartIndex = dynamicPartIndex;
}


/**
* ------------- TEMPLATES -------------
*/

/** Used to build templates (basically Mosaics) that will be reused for each instance of a Mosaic. */
const Template = function(strings, ...values) {
    this.strings = strings;
    this.values = values;
}
Template.prototype.getHTML = function() {
    const endIndex = this.strings.length - 1;
    let html = '';
    for(let i = 0; i < endIndex; i++) {
        const s = this.strings[i];
        const match = lastAttributeNameRegex.exec(s);
        
        if(match) {
            let placeholder = s.substring(0, match.index) + match[1] + match[2] + match[3] + boundAttributeSuffix + marker.substring(2) + '-->';
            html += placeholder;
        } else {
            let piece = s + nodeMarker;
            html += piece;
        }
    }
    return html + this.strings[endIndex];
}
Template.prototype.getTemplate = function() {
    const template = document.createElement('template');
    template.innerHTML = this.getHTML();
    return template;
}

/** The equivalent of the 'html' tagged function. */
export const m = (strings, ...values) => new Template(strings, values);