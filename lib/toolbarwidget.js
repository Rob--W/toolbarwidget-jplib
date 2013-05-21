/*globals require, exports*/
'use strict';
const winUtils = require('sdk/window/utils');

const browserURL = 'chrome://browser/content/browser.xul';
const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const ATTR_WIDGET_IS_NEW = getWidgetId(''); // Generate an extension-specific ID.

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

/**
 * widgetId: string    The ID of a <toolbarbutton> element
 *
 * Returns: List of widgets
 **/
function getToolbarWidgets(widgetId) {
    let widgets = [];
    for (let window of winUtils.windows()) {
        if (window.location != browserURL) continue;
        let widget = window.document.getElementById(widgetId);
        if (widget) {
            widgets.push(widget);
        }
    }
    return widgets;
}

/**
 * document: nsIDOMDocument     document to search for the <toolbar>
 * widgetId: string             The ID of a <toolbarbutton> element
 *
 * Returns: <toolbar> element containing the widget, or null otherwise.
 */
function getToolbarContainingWidget(document, widgetId) {
    let toolbars = document.getElementsByTagNameNS(NS_XUL, 'toolbar');
    let re_containsId = new RegExp('(?:^|,)' + widgetId + '(?:,|$)');
    for (let i = toolbars.length - 1; ~i; --i) {
        if (re_containsId.test(toolbars[i].getAttribute('currentset')))
            return toolbars[i];
    }
    return null;
}

// Identical to sdk/widget, with one addition:
// - optional string toolbarID
exports.ToolbarWidget = function(originalOptions) {
    let options = originalOptions;
    let toolbarID, widgetId, nextSiblingID;
    if (options) { // Create copy of _options
        options = Object.create(options);
        let orig_onAttach = options.onAttach;
        options.onAttach = function(widgetView) {
            onAttachWidget(widgetView);
            return orig_onAttach && orig_onAttach.apply(this, arguments);
        };
        toolbarID = options.toolbarID;
        widgetId = getWidgetId(options.id); // ID of <toolbaritem> XUL element
    }
    let sdkWidget = require('sdk/widget').Widget(options);

    // Move widget (<toolbarbutton>) to desired toolbar (determined by toolbarID)
    function moveWidget(widget) {
        let document = widget.ownerDocument;
        let $ = function(id) document.getElementById(id);

        // Move the toolbaritem to desired toolbar
        let tb = $(toolbarID) || getToolbarContainingWidget(document, widget.id);
        if (tb) { // Toolbar found!
            let b4;
            if (nextSiblingID) b4 = $(nextSiblingID);
            if (!b4) {
                let currentset = tb.getAttribute('currentset').split(',');
                let i = currentset.indexOf(options.id) + 1;

                // was the toolbarbutton id found in the current set?
                if (i > 0) {
                    // find a toolbarbutton to the right which actually exists
                    for (; i < currentset.length; ++i) {
                        b4 = $(currentset[i]);
                        if (b4) break;
                    }
                }
            }
            if (!b4 || widget.nextSibling != b4) {
                tb.insertItem(widget.id, b4, null, false);
            }
        }
    }
    function onAttachWidget(widgetView) {
        let originalTooltip = widgetView.tooltip;
        // Change tooltip to allow for an unique identification.
        let widgetViewID = widgetView.tooltip = Math.random().toString();
        getToolbarWidgets(widgetId).forEach(function(widget) {
            if (widget.getAttribute('tooltiptext') !== widgetViewID) return;

            let window = widget.ownerDocument.defaultView;

            moveWidget(widget);

            var saveTBNodeInfo = function(e) {
                toolbarID = widget.parentNode.getAttribute('id') || '';
                nextSiblingID = widget.nextSibling &&
                    widget.nextSibling.getAttribute('id').replace(/^wrapper-/i, '');
            };

            window.addEventListener('aftercustomization', saveTBNodeInfo, false);
            widgetView.on('detach', function() {
                window.removeEventListener('aftercustomization', saveTBNodeInfo, false);
            });
        });
        // Restore tooltip
        widgetView.tooltip = originalTooltip;
    } // end of onAttachWidget

    Object.defineProperty(sdkWidget, 'toolbarID', {
        get: function() toolbarID,
        set: function(value) {
            // Note, this feature is only available for consistence
            // Don't constantly move the toolbar from one place to another.
            toolbarID = value;
            getToolbarWidgets(widgetId).forEach(moveWidget);
        },
        enumerable: true
    });
    return sdkWidget;
};
// For testing purposes, define a hidden property:
Object.defineProperty(exports, 'getWidgetId', {
    get: function() getWidgetId
});
