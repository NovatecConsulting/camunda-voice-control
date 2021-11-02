plugins {
    id("com.github.johnrengelman.shadow") version "7.1.0"
    id("io.micronaut.application") version "2.0.6"
}

version = "0.1"
group = "info.novatec"

repositories {
    mavenCentral()
}

micronaut {
    runtime("jetty")
    testRuntime("junit5")
    processing {
        incremental(true)
        annotations("info.novatec.*")
    }
}

dependencies {
    annotationProcessor("io.micronaut:micronaut-http-validation")
    implementation("info.novatec:micronaut-camunda-bpm-feature:2.2.0")
    implementation("io.micronaut:micronaut-http-client")
    implementation("io.micronaut:micronaut-runtime")
    implementation("javax.annotation:javax.annotation-api")
    runtimeOnly("ch.qos.logback:logback-classic")
    runtimeOnly("com.h2database:h2")
    testImplementation("org.assertj:assertj-core")
    testImplementation("org.camunda.bpm.assert:camunda-bpm-assert:13.0.0")
    implementation("io.micronaut:micronaut-validation")

}


application {
    mainClass.set("info.novatec.Application")
}
java {
    sourceCompatibility = JavaVersion.toVersion("17")
    targetCompatibility = JavaVersion.toVersion("17")
}



