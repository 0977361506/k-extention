const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    popup: "./src/popup/popup.js",
    content: "./src/content/content.js",
    background: "./src/background/background.js",
    tiptap: "./src/content/richTextEditor/tiptap-init.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
    environment: {
      module: true,
    },
  },
  experiments: {
    outputModule: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    chrome: "88",
                  },
                  modules: false,
                },
              ],
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: "asset/resource",
        generator: {
          filename: "assets/[name][ext]",
        },
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "src/assets", to: "assets" },
        { from: "src/lib", to: "lib" },
        { from: "src/popup/popup.html", to: "popup.html" },
        { from: "src/popup/popup.css", to: "popup.css" },
        { from: "src/content/content.css", to: "content.css" },
        {
          from: "src/content/mermaidAI/mermaidAIChat.css",
          to: "mermaidAIChat.css",
        },
      ],
    }),
  ],
  resolve: {
    extensions: [".js", ".css"],
  },
  mode: "development",
  devtool: "source-map",
  optimization: {
    splitChunks: false,
  },
};
