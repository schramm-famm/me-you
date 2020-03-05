# Me-you
🎨 User interface for Riht. Vue.js is used as the front-end framework with
Vuex and vue-router as the state management and routing libraries.

## Endpoints

### `/conversations`
The main view for the user's conversations. It shows the list of conversations
in a side pane.

### `/conversations/:id`
This opens the conversation specified by the `id` parameter.

## Development

### Dependencies
All dependencies are installed by default in the
[vm](https://github.com/schramm-famm/vm), but the following links can be used to
install the dependencies on your local machine.

#### Node.js
Node.js is a JavaScript runtime that allows for creating dynamic web page
content and is required by Vue.js. Download Node.js from
[here](https://nodejs.org/en/download/).

#### npm
npm is a Node.js package manager. It allows for developers to share and download
Node.js packages. npm is installed with Node.js, so if you have Node.js
installed, then you have npm installed already as well. To check, you can run
`npm -v`, which will tell you what version of npm you have installed.

#### Vue CLI
Vue CLI is the command line interface provided by Vue.js to allow for rapid
Vue.js development. It can be installed by running `npm install -g @vue/cli`.

### Environment Variables

#### `VUE_APP_BACKEND`
The environment variable `VUE_APP_BACKEND` must be set for the front-end to
connect to the back-end. It should be set in a `.env.development.local` file in
the project root. The `.development` suffix specifies that the variables set in
the file should only be used in a development environment and the `.local`
suffix specifies that it should be ignored by git. For example, the content of
your `.env.development.local` file can look like the following:

```
VUE_APP_BACKEND=localhost:80
```

#### `VUE_APP_DEBUG`
This environment variable can be set to `true` to allow debug logs. Example:

```
VUE_APP_BACKEND=localhost:80
VUE_APP_DEBUG=true
```

### Initial Set-Up
When the repository is first cloned, `npm i` should be run to get all of the
repository's development dependencies.

### Building the project

* `npm run serve`: Starts a dev server
* `npm run build`: Produces a production-ready bundle in the dist/ directory
* `npm run lint`: Runs the linter on your project
