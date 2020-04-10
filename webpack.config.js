module.exports = {
  mode: "development",
  entry: {
    app: "./script.js"
  },
  output: {
    filename: "./[name].js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  watch: true,
  watchOptions: {
    // aggregateTimeout: 1000,
    // poll: 20000,
    ignored: /node_modules/,
  },
};
