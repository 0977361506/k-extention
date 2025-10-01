const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");
const ManifestGeneratorPlugin = require("./webpack-plugins/manifest-generator-plugin");
require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});

module.exports = {
  entry: {
    popup: path.resolve("src/popup/index.tsx"),
    background: path.resolve("src/background/background.ts"),
    confluence: path.resolve("src/service/confluence/confluence.tsx"),
  },
  module: {
    rules: [
      {
        use: "ts-loader",
        test: /\.tsx?$/,
        exclude: /node_modules/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
              modules: {
                localIdentName: "[name]__[local]--[hash:base64:5]",
              },
            },
          },
          "sass-loader",
        ],
        include: /\.module\.s[ac]ss$/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: ["style-loader", "css-loader", "sass-loader"],
        exclude: /\.module\.s[ac]ss$/,
      },
      {
        test: /\.css$/i,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                ident: "postcss",
                plugins: [tailwindcss, autoprefixer],
              },
            },
          },
        ],
      },
      {
        type: "asset/resource",
        test: /\.(png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|svg)$/,
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanStaleWebpackAssets: false,
    }),
    new ManifestGeneratorPlugin({
      templatePath: path.resolve("src/static/manifest.template.json"),
      replacements: {
        CONFLUENCE_URL: process.env.CONFLUENCE_URL || "http://localhost:8090",
      },
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve("src/static"),
          to: path.resolve("dist"),
          globOptions: {
            ignore: ["**/manifest.json", "**/manifest.template.json"],
          },
        },
        // Copy TinyMCE skins to the correct location that TinyMCE expects
        {
          from: path.resolve("node_modules/tinymce/skins"),
          to: path.resolve("dist/skins"),
        },
        // Copy TinyMCE icons to the correct location that TinyMCE expects
        {
          from: path.resolve("node_modules/tinymce/icons"),
          to: path.resolve("dist/icons"),
        },
        // Copy TinyMCE main script
        {
          from: path.resolve("node_modules/tinymce/tinymce.min.js"),
          to: path.resolve("dist/tinymce.min.js"),
        },
        {
          from: path.resolve("node_modules/tinymce/themes"),
          to: path.resolve("dist/themes"),
        },
        {
          from: path.resolve("node_modules/tinymce/plugins"),
          to: path.resolve("dist/plugins"),
        },
      ],
    }),
    ...getHtmlPlugins(["popup", "options", "newTab"]),
  ],
  resolve: {
    extensions: [".tsx", ".js", ".ts", ".scss"],
    fallback: {
      path: false,
      fs: false,
      os: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      assert: false,
      url: false,
      querystring: false,
      http: false,
      https: false,
      zlib: false,
      net: false,
      tls: false,
      child_process: false,
      constants: false,
      events: false,
      timers: false,
      string_decoder: false,
      punycode: false,
    },
  },
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "dist"),
  },
  optimization: {
    splitChunks: {
      chunks(chunk) {
        return chunk.name !== "confluence";
      },
    },
  },
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  devtool: process.env.NODE_ENV === "production" ? false : "inline-source-map",
};

function getHtmlPlugins(chunks) {
  return chunks.map(
    (chunk) =>
      new HtmlPlugin({
        title: "React Extension",
        filename: `${chunk}.html`,
        chunks: [chunk],
      })
  );
}
