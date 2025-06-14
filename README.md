# FireFoxyProxy Extension

A Firefox extension for managing 922proxy service connections through FoxyProxy. This extension allows you to generate and configure multiple proxies with unique identifiers and colors, making it easy to work with different proxy connections.

## Features

- Generate multiple proxy configurations with unique names and icons
- Manage Firefox containers with specific proxy settings
- Detect and display real-time IP and location information for each container
- Securely store proxy credentials
- Single-click refresh for container IP information
- Easy export of FoxyProxy configuration files

## Installation

1. Download or clone this repository
2. In Firefox, navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on..."
5. Select any file in the extension directory

## Usage

1. Click the extension icon to open the popup
2. Enter your 922proxy credentials. The extension no longer ships with
   built-in credentials, so you must supply your own username and password.
3. Click "Generate New Proxies" to create proxy configurations
4. Download the configuration file
5. Import the configuration into FoxyProxy

## Development / Packaging

### Modifying the extension

1. Clone the repository
2. Make your changes
3. Test in Firefox using the temporary add-on loading method

### Packaging the extension

The extension can be bundled for distribution using [web-ext](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/).

1. Install `web-ext`:

   ```bash
   npm install --global web-ext
   ```

2. Run the build command from the project root:

   ```bash
   web-ext build
   ```

   The resulting `.zip` file in the `web-ext-artifacts` directory can be uploaded to the Firefox Add-on portal.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
