package info.novatec;

import io.micronaut.context.event.ApplicationEventListener;
import io.micronaut.runtime.server.event.ServerStartupEvent;
import jakarta.inject.Singleton;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.camunda.bpm.engine.RuntimeService;

@Singleton
public class PizzaDeliveryProcessInstanceCreator implements
    ApplicationEventListener<ServerStartupEvent> {

  private static final List<String> orders = new ArrayList<>();
  private final RuntimeService runtimeService;

  public PizzaDeliveryProcessInstanceCreator(RuntimeService runtimeService) {
    this.runtimeService = runtimeService;
    orders.add("eine gro\u00dfe Pizza Salami");
    //orders.add("3x Funghi");
    //orders.add("1x Speziale");
  }

  @Override
  public void onApplicationEvent(ServerStartupEvent event) {
    orders.forEach(order -> this.runtimeService.startProcessInstanceByKey("pizza_delivery",
        Collections.singletonMap("order", order)));
  }
}
