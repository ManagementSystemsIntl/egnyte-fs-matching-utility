# Egnyte File System Matching Utility (EMU)

Visually compare file system structures of two directories in [Egynte](https://www.egnyte.com).

## Installation
1. Clone this repository: `git clone`
2. Enter project directory: `cd `
3. Install dependencies: `npm install`
4. Start a server: `python -m simpleHttpServer 8000`

## Usage
### Logging in
In order to use EMU, you need three things: an Egynte domain, a privileged Egynte account within that domain, and a valid [Egnyte for Developers API key](https://developers.egnyte.com/apps/myapps). Upon connecting to the page, an input box will prompt you for the Egnyte domain and API key. In the Egnyte domain input, you only need to provide the unique Egnyte subdomain, for instance `msiworldwide` instead of `https://msiworldwide.egnyte.com`. If the Egnyte domain and API key are valid, your browser will open a new tab with where you approve EMU's permissions. If your browser blocks pop-ups, you should disable pop-up blocking to use EMU. Once a valid domain and API key combination is provided, these values are stored in cookies, so you will not need to provide them again unless you log out of EMU or delete the cookies.

### Egnyte OAuth
EMU uses the [Egnyte JavaScript SDK] to handle authentication and querying. For authentication, we use the [`requestTokenPopup()`](https://github.com/egnyte/egnyte-js-sdk/blob/master/src/docs/api.md#initialize-and-connect-to-api) method to get a query token.

### Using EMU
In `app/app.module.js`, you will need to set the constant `emuBase` to whatever base directory from which you want to compare file systems. For instance, we are using EMU to ensure that project folder structures match a template, so our `emuBase` value is that root directory, `Shared/Projects`.

After that, you should mostly be set. To add or delete subfolders from the respective file path, click the plus/minus buttons on the right side of the input. Adjust the depth of the matching using the slider. A depth of 1 matches the paths' children folders, 2 matches children and grandchildren, 3 children, grandchildren, and great-grandchildren. Depth is capped at 3 due to throttling of the Egnyte API and daily API limits, but can be increased.

After clicking "Compare", the file structures for Paths 1 and 2 are compiled, diff'd, and visually displayed.

## License
The MIT License (MIT)

Copyright (c) 2014-present Stephen J. Collings, Matthew Honnibal, Pieter Vanderwerff

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
Copyright (c) 2017 Chase Gruber.
