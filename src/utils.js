/**
 * San DevHook
 * Copyright 2017 Baidu Inc. All rights reserved.
 *
 * @file Utils
 */


/**
 * Retrieve __san_devtool__ namespace if has.
 *
 * @return {Object}
 */
export function getDevtoolNS() {
    if (typeof window[SAN_DEVTOOL] !== 'object') {
        return null;
    }
    return window[SAN_DEVTOOL];
}


/**
 * Determine if the specified object is a San component.
 *
 * @param {Component} component  A Component instance.
 * @return {boolean}
 */
export function isSanComponent(component) {
    let ns = getDevtoolNS();
    if (!ns || !ns.san) {
        return false;
    }
    return component instanceof ns.san.Component;
}


/**
 * Get XPath string for the specified DOM element.
 *
 * @param {HTMLElement} element  A DOM element.
 * @return {boolean}
 */
export function getXPath(element) {
    if (!element) {
        return '';
    }
    if (element.id !== '') {
        return 'id("' + element.id + '")';
    }
    if (element === document.body) {
        return element.tagName;
    }

    let ix = 0;
    let siblings = element.parentNode.childNodes;
    for (let i of siblings) {
        if (i === element) {
            return getXPath(element.parentNode) + '/' + element.tagName
                + '[' + (ix + 1) + ']';
        }
        if (i.nodeType === Node.ELEMENT_NODE
            && i.tagName === element.tagName) {
            ix++;
        }
    }
}


/**
 * Parse a URL string to an object.
 *
 * @param {string} url  A URL.
 * @return {Object}
 */
export function parseUrl(url) {
    let params = {};
    for (let s of url.slice(url.indexOf('?') + 1).split('&')) {
        let kv = s.split('=');
        params[kv[0]] = kv[1];
    }
    return params;
}


/**
 * Execute the callback with context of the user's configuration.
 *
 * @param {Function} callback  A callback.
 * @param {Object} context  The execution context.
 * @param {Object?} args  The Arguments.
 * @param {Function} callback  A callback.
 * @return {*}
 */
export function executeCallback(callback, context, ...args) {
    if (typeof callback === 'function') {
        if (typeof context !== 'object') {
            context = null;
        }
        return callback.apply(context, args);
    }
}

