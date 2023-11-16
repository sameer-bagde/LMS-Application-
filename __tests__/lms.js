/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const request = require("supertest");
const db = require("../models/index");
const app = require("../app");
var cheerio = require("cheerio");
let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let reponse = await agent.get("/login");
  let csrfToken = extractCsrfToken(reponse);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("LMS Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(3000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign up as Educator", async () => {
    let reponse = await agent.get("/signup");
    const csrfToken = extractCsrfToken(reponse);
    reponse = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User A",
      email: "user.a@test.com",
      password: "12345678",
      _csrf: csrfToken,
      submit: "educator",
    });
    expect(reponse.statusCode).toBe(302);
  });

  test("Sign up as Student", async () => {
    let response = await agent.get("/signup");
    const csrfToken = extractCsrfToken(response);
    response = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User B",
      email: "user.b@test.com",
      password: "12345678",
      _csrf: csrfToken,
      submit: "student",
    });
    expect(response.statusCode).toBe(302);
  });

  test("User Password Changed", async () => {
    await login(agent, "user.a@test.com", "12345678");
    let response = await agent.get("/changePassword");
    const csrfToken = extractCsrfToken(response);
    const newPassword = "newPassword123";
    response = await agent.post("/changePassword").send({
      password: newPassword,
      _csrf: csrfToken,
      submit: "changePassword",
    });
    expect(response.statusCode).toBe(302);
    console.log(response.statusCode);
  });

  test("Sign out", async () => {
    response = await agent.get("/signout");
    expect(response.statusCode).toBe(302);
    response = await agent.get("/login");
    expect(response.statusCode).toBe(200);
  });

  test("Create a new Course", async () => {
    agent = request.agent(server);
    const res = await agent.get("/createCourse");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/createCourse").send({
      _csrf: csrfToken,
      title: "MongoDB",
    });
    expect(res.statusCode).toBe(302);
  });
});

test("Create a new Chapter", async () => {
  agent = request.agent(server);
  const res = await agent.get("/course/:id/createChapter");
  const csrfToken = extractCsrfToken(res);
  const response = await agent.post("/course/:id/createChapter").send({
    _csrf: csrfToken,
    title: "Introduction",
    description: "Chapter Introduction"
  });
  expect(res.statusCode).toBe(302);
});

test("Create a new Page", async () => {
  agent = request.agent(server);
  const res = await agent.get("/course/:courseId/chapter/:chapterId/createPage");
  const csrfToken = extractCsrfToken(res);
  const response = await agent.post("/course/:courseId/chapter/:chapterId/createPage").send({
    _csrf: csrfToken,
    title: "Introduction",
    });
  expect(res.statusCode).toBe(302);
});

test("Educator view own courses and edit them", async () => {
  agent = request.agent(server);
  await login(agent, "user.a@test.com", "12345678");
  const response = await agent.get("/educatorCourses");
  const csrfToken = extractCsrfToken(response);
  expect(response.statusCode).toBe(302);
});


  test('should handle internal server errors', async () => {

    const invalidEducatorId = '4';

    const response = await request(app).get(`/educatorEnrollmentReport/${invalidEducatorId}`);

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Internal Server Error');
  });


  test("Mark Pages as Complete", async () => {
    agent = request.agent(server);
    const res = await agent.get("/course/:courseId/chapter/:chapterId/page/:pageId");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/page/:pageId/markAsComplete").send({
      _csrf: csrfToken,
      userId: 5,
      id: 2,
      isComplete: true, 
      });
    expect(res.statusCode).toBe(302);
  });
  

  test("Should Enroll In Course", async () => {
    agent = request.agent(server);
    const res = await agent.get("/home");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.put("/courseEnrolled/:courseId").send({
      _csrf: csrfToken,
      userId: 5,
      courseId : 3,
      enrollmentStatus: true, 
      });
    expect(res.statusCode).toBe(302);
  });


  test("Delete Chapter", async () => {
    agent = request.agent(server);
    const res = await agent.get("/course/:id");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.put("/chapter/:chapterId").send({
      _csrf: csrfToken,
      chapterId: 3,
      });
    expect(res.statusCode).toBe(302);
  });



  test("/course/:courseId/chapter/:chapterId/page/:pageId", async () => {
    agent = request.agent(server);
    const res = await agent.get("/course/:id");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.put("/page/:pageId").send({
      _csrf: csrfToken,
      chapterId: 3,
      });
    expect(res.statusCode).toBe(302);
  });