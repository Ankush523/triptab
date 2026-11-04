module.exports = {
  project: {
    ios: {
      // ios-run.sh runs bundle + pod install; avoid RN CLI running pods twice
      automaticPodsInstallation: false,
    },
    android: {},
  },
};
