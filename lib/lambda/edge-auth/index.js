const { Authenticator } = require("cognito-at-edge");

const authenticator = new Authenticator({
  region: "ap-northeast-1",
  userPoolId: "ap-northeast-1_Nnb0W8wKm",
  userPoolAppId: "1c7lnj5636isqeu8ikdg0pn0fr",
  userPoolDomain: "iskw-poc-auth.auth.ap-northeast-1.amazoncognito.com",
});
console.log(process.env.COGNITO_USER_POOL_ID);

exports.handler = async (request) => {
  console.log("hello");
  try {
    console.log(request.Records[0].cf);
    console.log("Request payload:", JSON.stringify(request, null, 2));
  } catch (error) {
    console.log("Error:", error);
  }

  return authenticator.handle(request);
};
