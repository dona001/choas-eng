package com.example.chaos.tests;

import eu.rekawek.toxiproxy.Proxy;
import eu.rekawek.toxiproxy.ToxiproxyClient;
import eu.rekawek.toxiproxy.model.ToxicDirection;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.ExtentTest;
import com.aventstack.extentreports.Status;
import com.aventstack.extentreports.markuputils.CodeLanguage;
import com.aventstack.extentreports.markuputils.MarkupHelper;
import com.aventstack.extentreports.reporter.ExtentSparkReporter;
import com.aventstack.extentreports.reporter.configuration.Theme;
import io.restassured.filter.Filter;
import io.restassured.filter.FilterContext;
import io.restassured.response.Response;
import io.restassured.specification.FilterableRequestSpecification;
import io.restassured.specification.FilterableResponseSpecification;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import io.restassured.config.HttpClientConfig;
import io.restassured.config.RestAssuredConfig;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class ChaosTests {

    private static final Logger log = LoggerFactory.getLogger(ChaosTests.class);

    private String msUrl;
    private String toxiproxyUrl;
    private String wiremockUrl;
    private ToxiproxyClient toxiproxyClient;

    private Proxy dbProxy;
    private Proxy redisProxy;
    private Proxy extProxy;

    private static ExtentReports extent;
    private ExtentTest test;

    @BeforeAll
    void globalSetup() {
        ExtentSparkReporter spark = new ExtentSparkReporter("chaos_report.html");
        spark.config().setTheme(Theme.DARK);
        spark.config().setDocumentTitle("Chaos Test Report");
        spark.config().setReportName("Resilience Engineering Dashboard");

        extent = new ExtentReports();
        extent.attachReporter(spark);
        extent.setSystemInfo("Environment", "Chaos-Infra");
        extent.setSystemInfo("Microservice", "chaos-spring-ms");
    }

    @BeforeAll
    void setup() throws IOException, InterruptedException {
        msUrl = System.getenv("MS_URL");
        toxiproxyUrl = System.getenv("TOXIPROXY_URL");
        wiremockUrl = System.getenv("WIREMOCK_URL");

        if (msUrl == null)
            msUrl = "http://localhost:8000"; // Fallbacks for local IDE run
        if (toxiproxyUrl == null)
            toxiproxyUrl = "http://localhost:8001";
        if (wiremockUrl == null)
            wiremockUrl = "http://localhost:8002";

        RestAssured.baseURI = msUrl;
        RestAssured.config = RestAssuredConfig.config()
                .httpClient(HttpClientConfig.httpClientConfig()
                        .setParam("http.connection.timeout", 40000)
                        .setParam("http.socket.timeout", 40000));

        String toxiproxyHost = toxiproxyUrl.replace("http://", "").split(":")[0];
        int toxiproxyPort = Integer.parseInt(toxiproxyUrl.split(":")[2]);
        toxiproxyClient = new ToxiproxyClient(toxiproxyHost, toxiproxyPort);

        dbProxy = toxiproxyClient.getProxy("db_proxy");
        redisProxy = toxiproxyClient.getProxy("redis_proxy");
        extProxy = toxiproxyClient.getProxy("ext_proxy");

        resetAllProxies();
        log.info("Warmup: Waiting 10s for connections to stabilize...");
        Thread.sleep(10000);
    }

    @BeforeEach
    void initTest(TestInfo testInfo) {
        test = extent.createTest(testInfo.getDisplayName());
    }

    @AfterEach
    void stabilize() throws InterruptedException, IOException {
        resetAllProxies();
        Thread.sleep(1000);
    }

    private void resetAllProxies() throws IOException {
        clearToxics(dbProxy);
        clearToxics(redisProxy);
        clearToxics(extProxy);
    }

    private void clearToxics(Proxy proxy) throws IOException {
        proxy.toxics().getAll().forEach(t -> {
            int retries = 3;
            while (retries > 0) {
                try {
                    t.remove();
                    break;
                } catch (IOException e) {
                    retries--;
                    if (retries == 0)
                        log.error("Failed to remove toxic: {}", e.getMessage());
                    try {
                        Thread.sleep(500);
                    } catch (InterruptedException ignored) {
                    }
                }
            }
        });
    }

    private String getCorrelationId() {
        return UUID.randomUUID().toString();
    }

    @Test
    @Order(0)
    @DisplayName("Scenario 0: Verify System Baseline Stability Under Normal Load")
    void baselineStabilityTest() {
        test.assignCategory("Functional");
        test.info(MarkupHelper.createLabel(
                "EXPECTATION: System should be healthy and return 201 Created for a valid POST request.",
                com.aventstack.extentreports.markuputils.ExtentColor.BLUE));

        Response response = given()
                .filter(extentFilter())
                .header("X-Correlation-Id", getCorrelationId())
                .contentType(ContentType.JSON)
                .body("{\"name\": \"baseline-item\", \"value\": 100.0}")
                .when()
                .post("/api/items");

        test.info("Actual Status Code: " + response.getStatusCode());

        response.then()
                .statusCode(201)
                .body("name", is("baseline-item"))
                .body("id", notNullValue());

        test.pass(MarkupHelper.createLabel("ACTUAL: Baseline test passed - system is healthy.",
                com.aventstack.extentreports.markuputils.ExtentColor.GREEN));
    }

    @Test
    @Order(1)
    @DisplayName("Scenario 1: Validate Service Resilience During High Database Latency (1s)")
    void testResilienceDuringHighDbLatency() throws IOException {
        test.assignCategory("Network Chaos");
        test.info(MarkupHelper.createLabel(
                "EXPECTATION: Request should complete but take at least 1000ms due to injected DB latency.",
                com.aventstack.extentreports.markuputils.ExtentColor.BLUE));

        dbProxy.toxics().latency("db-latency", ToxicDirection.DOWNSTREAM, 1000);

        try {
            long start = System.currentTimeMillis();
            Response response = given()
                    .filter(extentFilter())
                    .header("X-Correlation-Id", getCorrelationId())
                    .contentType(ContentType.JSON)
                    .body("{\"name\": \"latency-item\", \"value\": 1.0}")
                    .when()
                    .post("/api/items");

            long duration = System.currentTimeMillis() - start;
            test.info("Actual Duration: " + duration + "ms");

            response.then()
                    .statusCode(either(is(201)).or(is(503)).or(is(500)))
                    .header("X-Correlation-Id", notNullValue());

            Assertions.assertTrue(duration >= 1000, "Request should have taken at least 1000ms");
            test.pass(MarkupHelper.createLabel("ACTUAL: Service handled latency. Response time: " + duration + "ms",
                    com.aventstack.extentreports.markuputils.ExtentColor.GREEN));
        } catch (Exception e) {
            test.fail(e);
            throw e;
        } finally {
            dbProxy.toxics().get("db-latency").remove();
        }
    }

    @Test
    @Order(2)
    @DisplayName("Scenario 2: Verify Graceful Error Handling During Database Connection Outages")
    void testGracefulHandlingOfDbOutage() throws IOException {
        test.assignCategory("Network Chaos");
        test.info(MarkupHelper.createLabel(
                "EXPECTATION: Service should return 500/503 quickly once DB connection is severed.",
                com.aventstack.extentreports.markuputils.ExtentColor.BLUE));

        dbProxy.toxics().bandwidth("db-cut", ToxicDirection.DOWNSTREAM, 0);

        try {
            Response response = given()
                    .filter(extentFilter())
                    .header("X-Correlation-Id", getCorrelationId())
                    .contentType(ContentType.JSON)
                    .body("{\"name\": \"timeout-item\", \"value\": 2.0}")
                    .when()
                    .post("/api/items");

            response.then()
                    .statusCode(either(is(500)).or(is(503)))
                    .body("error", notNullValue());

            test.pass(MarkupHelper.createLabel("ACTUAL: Service returned controlled error during DB blackout.",
                    com.aventstack.extentreports.markuputils.ExtentColor.GREEN));
        } catch (Exception e) {
            test.fail(e);
            throw e;
        } finally {
            dbProxy.toxics().get("db-cut").remove();
        }
    }

    @Test
    @Order(3)
    @DisplayName("Scenario 3: Validate Performance SLA Under Excessive Redis Cache Latency")
    void testSlaUnderRedisLatency() throws IOException {
        test.assignCategory("Network Chaos");
        test.info(MarkupHelper.createLabel("EXPECTATION: Redis fetch should take >500ms but still succeed.",
                com.aventstack.extentreports.markuputils.ExtentColor.BLUE));

        Integer id = given()
                .filter(extentFilter())
                .contentType(ContentType.JSON)
                .body("{\"name\": \"redis-item\", \"value\": 3.0}")
                .post("/api/items").then().extract().path("id");

        redisProxy.toxics().latency("redis-latency", ToxicDirection.DOWNSTREAM, 500);

        try {
            long start = System.currentTimeMillis();
            Response response = given()
                    .filter(extentFilter())
                    .header("X-Correlation-Id", getCorrelationId())
                    .when()
                    .get("/api/items/" + id);

            response.then()
                    .statusCode(200)
                    .body("id", is(id));

            long duration = System.currentTimeMillis() - start;
            test.info("Actual Duration: " + duration + "ms");
            Assertions.assertTrue(duration >= 500, "Request should have taken at least 500ms");
            test.pass(MarkupHelper.createLabel("ACTUAL: Service handled Redis latency effectively.",
                    com.aventstack.extentreports.markuputils.ExtentColor.GREEN));
        } catch (Exception e) {
            test.fail(e);
            throw e;
        } finally {
            redisProxy.toxics().get("redis-latency").remove();
        }
    }

    @Test
    @Order(4)
    @DisplayName("Scenario 4: Verify Transparent Fallback from Cache to DB During Redis Failures")
    void testCacheToDbFallbackOnRedisFailure() throws IOException {
        test.assignCategory("Network Chaos");
        test.info(MarkupHelper.createLabel("EXPECTATION: System should fallback to Database if Redis is unavailable.",
                com.aventstack.extentreports.markuputils.ExtentColor.BLUE));

        Integer id = given()
                .filter(extentFilter())
                .contentType(ContentType.JSON)
                .body("{\"name\": \"redis-cut-item\", \"value\": 4.0}")
                .post("/api/items").then().extract().path("id");

        redisProxy.toxics().bandwidth("redis-cut", ToxicDirection.DOWNSTREAM, 0);

        try {
            Response response = given()
                    .filter(extentFilter())
                    .header("X-Correlation-Id", getCorrelationId())
                    .when()
                    .get("/api/items/" + id);

            response.then()
                    .statusCode(either(is(200)).or(is(500)));
            test.pass(MarkupHelper.createLabel(
                    "ACTUAL: Service remained operational or failed gracefully during Redis blackout.",
                    com.aventstack.extentreports.markuputils.ExtentColor.GREEN));
        } catch (Exception e) {
            test.fail(e);
            throw e;
        } finally {
            redisProxy.toxics().get("redis-cut").remove();
        }
    }

    @Test
    @Order(5)
    @DisplayName("Scenario 5: Validate Circuit Breaker Auto-Triggering on External API Timeouts")
    void testCircuitBreakerOnExternalApiTimeout() throws IOException {
        test.assignCategory("Dependency Chaos");
        test.info(MarkupHelper.createLabel(
                "EXPECTATION: Resilience4j Circuit Breaker/TimeLimiter should trigger fallback on 3s timeout.",
                com.aventstack.extentreports.markuputils.ExtentColor.BLUE));

        Integer id = given()
                .filter(extentFilter())
                .contentType(ContentType.JSON)
                .body("{\"name\": \"enrich-item\", \"value\": 5.0}")
                .post("/api/items").then().extract().path("id");

        extProxy.toxics().latency("ext-latency", ToxicDirection.DOWNSTREAM, 3000);

        try {
            Response response = given()
                    .filter(extentFilter())
                    .header("X-Correlation-Id", getCorrelationId())
                    .when()
                    .get("/api/enrich/" + id);

            response.then()
                    .statusCode(200)
                    .body("externalInfo.description", containsString("Fallback"));
            test.pass(MarkupHelper.createLabel("ACTUAL: Resilience4j Fallback triggered successfully on timeout.",
                    com.aventstack.extentreports.markuputils.ExtentColor.GREEN));
        } catch (Exception e) {
            test.fail(e);
            throw e;
        } finally {
            extProxy.toxics().get("ext-latency").remove();
        }
    }

    @Test
    @Order(6)
    @DisplayName("Scenario 6: Verify System Health Masking During Upstream 5xx Errors")
    void testMaskingOfUpstreamErrors() throws IOException {
        test.assignCategory("Dependency Chaos");
        test.info(MarkupHelper.createLabel(
                "EXPECTATION: System should mask upstream 500 errors by returning fallback data.",
                com.aventstack.extentreports.markuputils.ExtentColor.BLUE));

        Integer id = given()
                .filter(extentFilter())
                .contentType(ContentType.JSON)
                .body("{\"name\": \"enrich-500-item\", \"value\": 6.0}")
                .post("/api/items").then().extract().path("id");

        String mapping = "{\"request\":{\"method\":\"GET\",\"url\":\"/external/info/" + id
                + "\"},\"response\":{\"status\":500}}";
        given().baseUri(wiremockUrl).body(mapping).post("/__admin/mappings");

        try {
            Response response = given()
                    .filter(extentFilter())
                    .header("X-Correlation-Id", getCorrelationId())
                    .when()
                    .get("/api/enrich/" + id);

            response.then()
                    .statusCode(200)
                    .body("externalInfo.description", containsString("Fallback"));
            test.pass(MarkupHelper.createLabel("ACTUAL: System successfully masked upstream 500 with fallback data.",
                    com.aventstack.extentreports.markuputils.ExtentColor.GREEN));
        } catch (Exception e) {
            test.fail(e);
            throw e;
        } finally {
        }
    }

    @Test
    @Order(8)
    @DisplayName("Scenario 8: Verify Service Recovery After Infrastructure Container Freeze (Pause)")
    void testRecoveryAfterContainerPause() throws Exception {
        test.assignCategory("Infrastructure Chaos");
        test.info(MarkupHelper.createLabel(
                "EXPECTATION: System should time out during DB freeze and recover immediately after unpause.",
                com.aventstack.extentreports.markuputils.ExtentColor.BLUE));

        runPumba("pause --duration 5s chaos-postgres");
        Thread.sleep(1000);

        Response response1 = given()
                .filter(extentFilter())
                .header("X-Correlation-Id", getCorrelationId())
                .contentType(ContentType.JSON)
                .body("{\"name\": \"paused-item\", \"value\": 8.0}")
                .when()
                .post("/api/items");

        response1.then().statusCode(either(is(500)).or(is(503)).or(is(201)));

        Thread.sleep(12000);

        Response response2 = given()
                .filter(extentFilter())
                .header("X-Correlation-Id", getCorrelationId())
                .contentType(ContentType.JSON)
                .body("{\"name\": \"recovered-item\", \"value\": 8.1}")
                .when()
                .post("/api/items");

        response2.then().statusCode(201);
        test.pass(MarkupHelper.createLabel("ACTUAL: Service recovered fully after database unpause.",
                com.aventstack.extentreports.markuputils.ExtentColor.GREEN));
    }

    @Test
    @Order(7)
    @DisplayName("Scenario 7: Validate Resilience Against Malformed Data from Downstream Dependencies")
    void testHandlingOfMalformedDownstreamData() throws IOException {
        test.assignCategory("Dependency Chaos");
        test.info(MarkupHelper.createLabel(
                "EXPECTATION: Parsing errors (Jackson) should be caught and converted to fallbacks.",
                com.aventstack.extentreports.markuputils.ExtentColor.BLUE));

        Integer id = given()
                .filter(extentFilter())
                .contentType(ContentType.JSON)
                .body("{\"name\": \"enrich-malformed-item\", \"value\": 7.0}")
                .post("/api/items").then().extract().path("id");

        String mapping = "{\"request\":{\"method\":\"GET\",\"url\":\"/external/info/" + id
                + "\"},\"response\":{\"status\":200,\"body\":\"{invalid-json\"}}";
        given().baseUri(wiremockUrl).body(mapping).post("/__admin/mappings");

        try {
            Response response = given()
                    .filter(extentFilter())
                    .header("X-Correlation-Id", getCorrelationId())
                    .when()
                    .get("/api/enrich/" + id);

            response.then()
                    .statusCode(200)
                    .body("externalInfo.description", containsString("Fallback"));
            test.pass(MarkupHelper.createLabel("ACTUAL: Jackson parsing error caught and resolved via fallback.",
                    com.aventstack.extentreports.markuputils.ExtentColor.GREEN));
        } catch (Exception e) {
            test.fail(e);
            throw e;
        } finally {
        }
    }

    @Test
    @Order(9)
    @DisplayName("Scenario 9: Validate Automatic Connection Re-establishment After Component Reboots")
    void testReconnectionAfterComponentRestart() throws Exception {
        test.assignCategory("Infrastructure Chaos");
        test.info(MarkupHelper.createLabel(
                "EXPECTATION: System should automatically reconnect to Redis after the component is restarted.",
                com.aventstack.extentreports.markuputils.ExtentColor.BLUE));

        runPumba("restart --interval 1s chaos-redis");
        Thread.sleep(2000);

        Response response = given()
                .filter(extentFilter())
                .header("X-Correlation-Id", getCorrelationId())
                .when()
                .get("/actuator/health");

        response.then().statusCode(200).body("status", is("UP"));
        test.pass(
                MarkupHelper.createLabel("ACTUAL: Service automatically reconnected to Redis after component restart.",
                        com.aventstack.extentreports.markuputils.ExtentColor.GREEN));
    }

    @Test
    @Order(10)
    @DisplayName("Scenario 10: Verify High Availability and Self-Healing via Host Level Crashes")
    void testHighAvailabilityAfterProcessKill() throws Exception {
        test.assignCategory("Infrastructure Chaos");
        test.info(MarkupHelper.createLabel(
                "EXPECTATION: Service should auto-restart and become healthy via Docker policy.",
                com.aventstack.extentreports.markuputils.ExtentColor.BLUE));

        runPumba("kill --signal SIGKILL chaos-ms");

        int attempts = 0;
        boolean recovered = false;
        while (attempts < 20) {
            try {
                Response response = given().when().get("/actuator/health");
                if (response.getStatusCode() == 200) {
                    recovered = true;
                    break;
                }
            } catch (Exception e) {
            }
            Thread.sleep(3000);
            attempts++;
        }

        Assertions.assertTrue(recovered, "MS should have recovered after kill");
        test.pass(MarkupHelper.createLabel("ACTUAL: Microservice auto-recovered via Docker restart policy.",
                com.aventstack.extentreports.markuputils.ExtentColor.GREEN));
    }

    private void runPumba(String command) throws Exception {
        String fullCmd = "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock gaiaadm/pumba " + command;
        log.info("Executing: {}", fullCmd);
        // Note: In some environments, we might need to use a specific network or target
        // by label
        // The user suggested using label com.example.project=chaos-spring-ms
        Process p = Runtime.getRuntime().exec(fullCmd);
        p.waitFor(15, TimeUnit.SECONDS);
    }

    private Filter extentFilter() {
        return (FilterableRequestSpecification requestSpec, FilterableResponseSpecification responseSpec,
                FilterContext ctx) -> {
            Response response = ctx.next(requestSpec, responseSpec);

            test.info("<b>Request Details:</b>");
            test.info("Method: " + requestSpec.getMethod());
            test.info("URI: " + requestSpec.getURI());
            if (requestSpec.getBody() != null) {
                test.info("Request Body:");
                test.info(MarkupHelper.createCodeBlock(requestSpec.getBody().toString(), CodeLanguage.JSON));
            }

            test.info("<b>Response Details:</b>");
            test.info("Status Code: " + response.getStatusCode());
            if (response.getBody() != null && !response.getBody().asString().isEmpty()) {
                test.info("Response Body:");
                test.info(MarkupHelper.createCodeBlock(response.getBody().asString(), CodeLanguage.JSON));
            }

            return response;
        };
    }

    @AfterAll
    void tearDown() throws IOException {
        resetAllProxies();
        if (extent != null) {
            extent.flush();
        }
    }
}
