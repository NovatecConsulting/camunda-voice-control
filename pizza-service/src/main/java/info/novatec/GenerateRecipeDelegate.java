package info.novatec;

import jakarta.inject.Singleton;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
public class GenerateRecipeDelegate implements JavaDelegate {

  private static final Logger log = LoggerFactory.getLogger(GenerateRecipeDelegate.class);

  @Override
  public void execute(DelegateExecution delegateExecution) {
    log.info("Generating Recipe");
    String order = (String) delegateExecution.getVariable("order");
    log.info(order);
  }
}
