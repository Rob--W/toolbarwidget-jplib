The `toolbarwidget` module enables you to create [widgets](modules/sdk/widget.html) and place it on any toolbar.

The API is identical to [`sdk/widget`](modules/sdk/widget.html). Only the `toolbarID` and `forceMove` properties have been added.
Only these extra properties are documented here, see the [`sdk/widget` documentation](modules/sdk/widget.html) for the full documentation.

## Example ##

    require("toolbarwidget").ToolbarWidget({
        toolbarID: "nav-bar", // Place widget on navigation bar
        id: "mozilla-icon",
        label: "My Mozilla Widget",
        contentURL: "http://www.mozilla.org/favicon.ico"
    });

<api name="ToolbarWidget">
@class

Represents a [Widget](modules/sdk/widgets.html).

<api name="ToolbarButton">
@constructor
Creates a new widget. The widget is immediately added to the specified toolbar.

@param options {object}
An object with [all keys from widget](modules/sdk/widget.html#Widget%29options%29) and the following key:

  @prop toolbarID {string}
    The id of the toolbar which you want to add the widget to.
    If invalid, it will be placed on the default addon bar.

    Example toolbar IDs:

    - **toolbar-menubar**: The menu bar.
    - **nav-bar**: The navigation bar.
    - **PersonalToolbar**: The bookmarks toolbar.
    - **TabsToolbar**: The tabs bar.
    - **addon-bar**: The addon bar.

  @prop forceMove {boolean}
    If true, the toolbar will be forced to stick at its position.

</api>
<api name="toolbarID">
@property {string}
  The ID of the toolbar to which you've added the widget.  Read-only.
</api>
<api name="forceMove">
@property {boolean}
  If true, the toolbar will be forced to stick at its position.
</api>
</api>
