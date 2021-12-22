package info.novatec;

import jakarta.inject.Singleton;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
public class DiscountDelegate implements JavaDelegate {

  private static final Logger log = LoggerFactory.getLogger(DiscountDelegate.class);

  @Override
  public void execute(DelegateExecution delegateExecution) {
    String order = (String) delegateExecution.getVariable("order");
    log.info(String.format("10%% Discount for %s!", order));
  }
}
