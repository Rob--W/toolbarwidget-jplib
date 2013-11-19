/**
 * (c) 2013 Rob W <gwnRob@gmail.com>
 * MIT license
 **/
/*globals require, exports, console*/
'use strict';
const winUtils = require('sdk/window/utils');
const { browserWindows } = require('sdk/windows');

const browserURL = 'chrome://browser/content/browser.xul';
const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * widgetID: A sdk/widget ID
 *
 * Returns: The ID of the corresponding <toolbarbutton> element.
 */
function getWidgetId(widgetId) {
    // This method is based on code in sdk/widget.js, look for setAttribute("id", id);

    // Temporary work around require("self") failing on unit-test execution ...
    let jetpackID = "testID";
    try {
        jetpackID = require("sdk/self").id;
    } catch(e) {}
    return "widget:" + jetpackID + "-" + widgetId;
}

// currentset manipulation methods
function getCurrentSet(toolbar) {
    let currentSet = toolbar.getAttribute('currentset') || toolbar.currentSet;
    currentSet = currentSet == '__empty' ? [] : currentSet.split(',');
    return currentSet;
}
function setCurrentSet(toolbar, /*array*/currentSet) {
    currentSet = currentSet.length ? currentSet.join(',') : '__empty';
    toolbar.setAttribute('currentset', currentSet);
    // Save position
    toolbar.ownerDocument.persist(toolbar.id, 'currentset');
}

// Change the currentset attribute of a toolbar.
function moveWidgetToToolbar(config) {
    let { toolbarID, insertbefore, widgetId, forceMove, weakmap } = config;
    let movedWidgets = 0;

    // Go through all windows, and set the currentset attribute of the <toolbar>
    // with ID toolbarID (unless a different toolbar has contains the widget,
    //   and forceMove is false)
    windowsLoop: for (let window of winUtils.windows()) {
        if (window === null || window.location != browserURL) continue;

        // Skip window if forceMove is false and it was already seen
        if (!forceMove && weakmap.has(window)) continue;
        weakmap.set(window, '');

        for (let toolbar of window.document.getElementsByTagNameNS(NS_XUL, 'toolbar')) {
            let currentSet = getCurrentSet(toolbar);
            let index = currentSet.indexOf(widgetId);
            if (~index) { // Toolbar contains widget...
                if (toolbar.getAttribute('id') != toolbarID && forceMove) {
                    currentSet.splice(index, 1);
                    setCurrentSet(toolbar, currentSet);
                    // Now put the widget on the desired toolbar
                    saveWidgetToToolbar(window.document);
                }
                continue windowsLoop;
            }
        }
        // Didn't find any toolbar matching the ID.
        saveWidgetToToolbar(window.document);
    }
    function saveWidgetToToolbar(document) {
        let toolbar = document.getElementById(toolbarID);
        // TODO: Remove console.error, or emit error events?
        if (!toolbar) {
            console.error('No toolbar found with ID "' + toolbarID + '"!');
            return;
        }
        if (!/^toolbar$/i.test(toolbar.tagName)) { // TODO: Is this check needed?
            console.error('Element with ID "' + toolbarID + '" is not a <toolbar>!');
            return;
        }
        let currentSet = getCurrentSet(toolbar);
        let index = -1;
        // Insert element before first found insertbefore, if specified.
        for (let beforeElementId of insertbefore) {
            if ((index = currentSet.indexOf(beforeElementId)) !== -1) {
                break;
            }
        }
        if (index !== -1) {
            currentSet.splice(index, 0, widgetId);
        } else {
            currentSet.push(widgetId);
        }
        setCurrentSet(toolbar, currentSet);
        ++movedWidgets;
    }
    return movedWidgets;
}

// Ensures that all widgets has the following height
function setWidgetHeight(options, isToolbarheightReliable) {
    let { widgetId, onCustomizationChange } = options;
    // If you're on private browsing mode, winUtils.windows
    // Does not correctly give you all the private windows even if you've
    // selected the permissions so we will ensure that at least the current
    // window has the correct toolbar widget by building an array of windows
    // manually
    let currentWin = winUtils.getFocusedWindow();
    let windows = winUtils.windows();

    // Only add the current window if it isn't already found
    if (windows.indexOf(currentWin) === -1) {
        windows.push(currentWin);
    }
    for (let window of windows) {
        if (window === null || window.location != browserURL) continue;
        let widget = window.document.getElementById(widgetId);
        if (widget) {
            setXulWidgetHeight(widget, options, isToolbarheightReliable);
            if (onCustomizationChange) {
                // No need to check whether the listener is already added or not, because
                // addEventListener will ignore subsequent calls with the same arguments.
                window.addEventListener('customizationchange', onCustomizationChange);
            }
        }
    }
}

// boolean isToolbarheightReliable: When the buttons are rendered for the first time, the
// toolbar's height is assumed to be reliable, because all existing items will respect the user's
// height preference. When the height preference is changed, this value is not reliable any more
// because other buttons might still have the height of the old preference, so we fall back to
// hard-coded maximum values.
function setXulWidgetHeight(widget, options, isToolbarheightReliable) {
    let { height, autoShrink, aspectRatio } = options;
    let iframe = widget.querySelector('iframe');
    if (!iframe) return;
    // The height of the button depends on several implementation-defined factors:
    // - The widget's minHeight (widget.js: _createNode)
    // - The iframe's maxHeight (widget.js: fill)
    // - The iframe's height (widget.js: fill)

    // Decrease the lower bound if needed
    if (parseFloat(widget.style.minHeight) > height) {
        widget.style.minHeight = height + 'px';
    }
    // Shrink height when the container has a smaller height
    if (autoShrink) {
        let toolbar = widget.parentNode;
        if (toolbar.id.lastIndexOf('wrapper-', 0) === 0) {
            // Customization mode.
            toolbar = toolbar.parentNode;
        }
        let maxHeight;
        if (isToolbarheightReliable) {
            // Decrease content's height in order to detect the real height of the toolbar excluding the button
            iframe.style.maxHeight = widget.style.minHeight || '16px';
            let style = widget.ownerDocument.defaultView.getComputedStyle(toolbar);
            maxHeight = parseFloat(style.height) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        } else {
            // When the toolbar's height is not reliable, use hard-coded values.
            // NOTE: These values are certainly correct for nav-bar. They might be incorrect for other toolbars.
            let iconsize = toolbar.getAttribute('iconsize');
            if (iconsize == 'small') {
                maxHeight = 19;
            } else if (iconsize == 'large') {
                maxHeight = 33;
            }
        }
        if (maxHeight > 0 && maxHeight < height) {
            height = maxHeight;
        }
    }
    iframe.style.height = height + 'px';
    iframe.style.maxHeight = height + 'px';

    if (aspectRatio) {
        let width = height / aspectRatio;
        iframe.style.width = width + 'px';
        if (parseFloat(widget.style.minWidth) > width) {
            widget.style.minWidth = width + 'px';
        }
    }
}

function validateHeight(height) {
    if (typeof height != 'number' || height < 0 || isNaN(height) || !isFinite(height)) {
        throw new Error('ToolbarWidget.height is not a number ' + height);
    }
    return true;
}
function validateAspectRatio(aspectRatio) {
    if (typeof aspectRatio != 'number' || aspectRatio < 0 || isNaN(aspectRatio) || !isFinite(aspectRatio)) {
        throw new Error('ToolbarWidget.aspectRatio should be a non-negative number. Got ' + aspectRatio);
    }
    return true;
}

// Identical to sdk/widget, with one addition:
// - optional string toolbarID
// - optional string or array of strings insertbefore
// - optional boolean forceMove
// - optional number height
// - optional boolean autoShrink (default true)
// - optional number aspectRatio (default 0 = none)
exports.ToolbarWidget = function(options) {
    let config;
    if (options) {
        if ('height' in options) validateHeight(options.height);
        if ('aspectRatio' in options) validateAspectRatio(options.aspectRatio);
        config = {
            height: options.height,
            autoShrink: options.autoShrink !== false,
            aspectRatio: +options.aspectRatio || 0,

            toolbarID: options.toolbarID,
            insertbefore: options.insertbefore || [],
            widgetId: getWidgetId(options.id), // ID of <toolbaritem> XUL element
            forceMove: !!options.forceMove,
            weakmap: new WeakMap() // Used to request a movement only once if forceMove is false
        };
        if (!Array.isArray(config.insertbefore)) {
            config.insertbefore = [config.insertbefore];
        }
        if (config.toolbarID)
            moveWidgetToToolbar(config);
    }
    let sdkWidget = require('sdk/widget').Widget(options);
    if (config) {
        // Watch new windows and apply position
        if (config.toolbarID || config.height) {
            let destroyed = false;
            let onNewWindow = function() {
                if (config.toolbarID)
                    moveWidgetToToolbar(config);
                if (config.height)
                    setWidgetHeight(config, true);

            };
            browserWindows.on('open', onNewWindow);
            if (config.height && config.autoShrink) {
                // This function will be added as an event listener to a document containing the widget.
                config.onCustomizationChange = function() {
                    if (!destroyed) {
                        setWidgetHeight(config, false);
                    }
                };
            }
            if (config.height)
                setWidgetHeight(config, true);

            let destroy = sdkWidget.destroy;
            sdkWidget.destroy = function toolbarWidgetDestructor() {
                if (destroyed) return;
                destroyed = true;
                browserWindows.removeListener('open', onNewWindow);
                if (config.onCustomizationChange) {
                    for (let window of winUtils.windows()) {
                        if (window === null || window.location != browserURL) continue;
                        window.removeEventListener('customizationchange', config.onCustomizationChange);
                    }
                }
                return destroy.call(this);
            };
            require('sdk/system/unload').ensure(sdkWidget, 'destroy');
        }

        // Add extra properties to returned object
        Object.defineProperties(sdkWidget, {
            toolbarID: {
                get: function() config.toolbarID,
                enumerable: true
            },
            insertbefore: {
                get: function() config.insertbefore.slice(),
                enumerable: true
            },
            forceMove: {
                get: function() config.forceMove,
                set: function(val) config.forceMove = !!val,
                enumerable: true
            },
            height: {
                get: function() config.height,
                set: function(val) {
                    if (validateHeight(val)) {
                        config.height = val;
                        setWidgetHeight(config, false);
                    }
                },
                enumerable: true
            }
        });
    }
    return sdkWidget;
};
// For testing purposes, define a hidden property:
Object.defineProperty(exports, 'getWidgetId', {
    get: function() getWidgetId
});
