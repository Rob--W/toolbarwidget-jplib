# SDK Widgets on toolbars
This Jetpack module extends the `sdk/widget` module with one extra property, `toolbarID`, allowing Firefox Add-on developers to place widgets on toolbars.

## Usage
The API is identical to [`sdk/widget`](https://addons.mozilla.org/en-US/developers/docs/sdk/1.14/modules/sdk/widget.html). Only the `toolbarID` property has been added.

Here's an example, based on the first example from the [`sdk/widget` documentation](https://addons.mozilla.org/en-US/developers/docs/sdk/1.14/modules/sdk/widget.html#Creation%20and%20Content). The created widget is not placed on the addon bar, but on the navigation bar.

```javascript
require("toolbarwidget").ToolbarWidget({
    toolbarID: "nav-bar", // <-- This is the only addition
    id: "mozilla-icon",
    label: "My Mozilla Widget",
    contentURL: "http://www.mozilla.org/favicon.ico"
});
```

`ToolbarWidget` creates a `sdk/widget` instance, moves it to the desired toolbar, and returns the `Widget` instance.  
This instance has a getter/setter for `toolbarID`. This property is provided for convenience, do not constantly move the button around the interface!


## Dependencies
The following standard Jetpack modules were used:

- [`sdk/windows/utils`](https://addons.mozilla.org/en-US/developers/docs/sdk/1.14/modules/sdk/window/utils.html)
- [`sdk/widget`](https://addons.mozilla.org/en-US/developers/docs/sdk/1.14/modules/sdk/widget.html)

## Credits
Created by Rob Wu <gwnRob@gmail.com>.  
Inspired by Erik Void's [toolbarbutton](https://github.com/voldsoftware/toolbarbutton-jplib), a module which allows one to easily create simple toolbar buttons.

Released under a MIT license.
