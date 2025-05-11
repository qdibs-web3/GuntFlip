module.exports = {
    // Other Webpack config...
    resolve: {
      fallback: {
        "stream": require.resolve("stream-browserify"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "zlib": require.resolve("browserify-zlib")
      }
    }
  };
  