package info.novatec;

import jakarta.inject.Singleton;
import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
public class GenerateInvoiceDelegate implements JavaDelegate {

  private static final Logger log = LoggerFactory.getLogger(GenerateInvoiceDelegate.class);

  @Override
  public void execute(DelegateExecution delegateExecution) {
    String order = (String) delegateExecution.getVariable("order");
    log.info("Generating Invoice for {}!", order);
  }
}
