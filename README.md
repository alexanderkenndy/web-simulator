# Ripple

A browser based, platform agnostic mobile application development and testing tool.
 
All source code (excluding third party libraries) are subject to:

Copyright (c) 2011 Research In Motion Limited

## License

All assets in this repository, unless otherwise stated through sub-directory LICENSE or NOTICE files, are subject to the Apache Software License v.2.0.

In particular, the assets under ext/assets/images are excluded from the Apache Software License v.2.0.  Please see the [NOTICE](https://github.com/blackberry/Ripple-UI/tree/master/ext/assets/images) file for more details.

## Build Requirements

* nodejs, npm

    nodejs: v0.4.12 is preferred. Later versions are not tested.

       npm: If you are located behind a firewall, you might need to set up a proxy for npm. Just edit ~/.npmrc and add your proxy accordingly.
                registry = http://registry.npmjs.org/
                proxy = http://some.business.com:8080

* OSX or linux (windows is not currently supported for development)

## Getting Started

    ./configure

This script will pull down the needed npm packages and initialize the submodules.

## Build Commands

    jake

This will build ripple to the pkg/ folder. In that folder there is a web directory and a chromium directory.

To test ripple as an extension in chrome/chromium just load the chromium folder as an unpacked extension.

    jake -T

This will describe all the available commands for building and running the tests.

## Running as a Chrome Extension

* Go to the extension management page (chrome://chrome/extensions/) in chrome.
* Ensure that you have selected the developer mode checkbox.
* Click the Load Unpacked extension button.
* Select the chromestore folders in the pkg/ folder.

NOTE: For development you should be fine to just build with jake and refresh your browser.
If you end up editing anything in the ext folder you will need to refresh the extension from the extension management page.

## Running Inside Other Web Browsers

Ripple is (by-design) browser agnostic, and is able to run inside any web browser (with disabled web security).

However, this has (for the most part) only been used in Chrome (and as a result certain things are used that are not supported/tested in other browsers).

To get it running inside Chrome you should start it with these [command line](http://www.chromium.org/developers/how-tos/run-chromium-with-flags) flags:

    --app=http://path/to/ripple-ui/pkg/web
    --disable-web-security
    --user-data-dir=/path/to/dummy/profile
## Running on node-webkit
node-webkit is an environment which intergated with nodejs and webkit(if blink would be better),the developer can write front-end javascript application to invoke nodejs's interface thus to operate native resources.
* Download node-webkit
* package the files to yourname.nw
* build the yourname.nw to and executable programme which can be run on windows/linux or mac oxs
## Code Guidelines

* 4 spaces per editor tab.
* `jake lint`, no new lint errors introduced.
* All unit tests are green.

## Reference Material &amp; Community

You can also find associated reference material for the Ripple tool as well as contributor forums at the following locations.

* [Contributor Forums](http://supportforums.blackberry.com/t5/Ripple-Contributions/bd-p/ripple)
* [Documentation](http://rippledocs.tinyhippos.com/index.html)

