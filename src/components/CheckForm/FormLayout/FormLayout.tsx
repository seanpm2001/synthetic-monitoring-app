import React, { Children, isValidElement, ReactNode, useCallback } from 'react';
import { FieldErrors, FieldPath, useFormContext } from 'react-hook-form';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css, cx } from '@emotion/css';
import { flatten } from 'flat';

import { CheckFormValues } from 'types';
import { Collapse } from 'components/Collapse';
import { CollapseLabel } from 'components/CollapseLabel';

import { FormLayoutContextProvider, useFormLayoutContext } from './useFormLayoutContext';

type FormLayoutProps = {
  children: ReactNode;
};

export const FormLayout = ({ children }: FormLayoutProps) => {
  return (
    <FormLayoutContextProvider>
      {Children.map(children, (child, index) => {
        return isValidElement(child) && child.type === FormSection ? (
          <FormSectionInternal {...child.props} index={index} />
        ) : null;
      })}
    </FormLayoutContextProvider>
  );
};

type FormSectionProps = {
  children: ReactNode;
  label: string;
  fields?: Array<FieldPath<CheckFormValues>>;
  supportingContent?: ReactNode;
};

// return doesn't matter as we take over how this behaves internally
const FormSection = (props: FormSectionProps) => {
  return props.children;
};

const FormSectionInternal = ({
  children,
  index,
  label,
  fields,
  supportingContent,
}: FormSectionProps & { index: number }) => {
  const isOpen = index === 0;
  const styles = useStyles2(getStyles);
  const {
    state: [sectionState, updateSectionState],
  } = useFormLayoutContext();
  const state = sectionState[index];
  const anyNextSectionActive = sectionState.slice(index + 1).some((section) => section.active);
  const active = state.active || anyNextSectionActive;
  const isLastFormSection = index === sectionState.length - 1;
  const { formState } = useFormContext<CheckFormValues>();
  const relevantErrors = checkForErrors(formState.errors, fields);
  const hasErrors = relevantErrors.length > 0;
  const showValidation = formState.isSubmitted;
  const isValid = showValidation && !hasErrors;

  const handleClick = useCallback(
    (isActive: boolean) => {
      updateSectionState({
        index,
        state: {
          active: isActive,
        },
      });
    },
    [index, updateSectionState]
  );

  return (
    <div
      className={cx(styles.container, {
        [styles.toNextSection]: !isLastFormSection,
        [styles.activeSection]: active,
        [styles.validSection]: isValid,
        [styles.invalidSection]: hasErrors,
      })}
    >
      <div
        className={cx(styles.indicator, {
          [styles.activeIndicator]: active,
          [styles.validIndicator]: isValid,
          [styles.invalidIndicator]: hasErrors,
        })}
      >
        {index + 1}
      </div>
      <div className={styles.content}>
        <Collapse
          label={<CollapseLabel label={label} icon={hasErrors ? `exclamation-triangle` : undefined} />}
          isOpen={isOpen}
          onClick={handleClick}
        >
          <div className={styles.collapseContent}>
            <div>{children}</div>
            {supportingContent && (
              <div>
                <div className={styles.supportingContent}>{supportingContent}</div>
              </div>
            )}
          </div>
        </Collapse>
      </div>
    </div>
  );
};

function checkForErrors(errors: FieldErrors<CheckFormValues>, fields: Array<FieldPath<CheckFormValues>> = []) {
  const flattenedErrors = Object.keys(flatten(errors));
  const typeErrors = flattenedErrors.filter((error) => error.endsWith('.type')).map((error) => error.split('.type')[0]);
  const relevantErrors = typeErrors.filter((error) => {
    if (fields.some((field) => error.startsWith(field))) {
      return true;
    }

    return false;
  });

  return relevantErrors;
}

const getStyles = (theme: GrafanaTheme2) => {
  const fontSize = 16;
  const size = fontSize + 16;
  const inactiveColor = theme.colors.background.secondary;
  const activeColor = theme.colors.info.shade;
  const invalidColor = theme.colors.error.main;
  const validColor = theme.colors.success.main;

  return {
    container: css({
      display: `grid`,
      gridTemplateColumns: `${size}px 1fr`,
      gap: theme.spacing(2),
    }),
    toNextSection: css({
      position: `relative`,

      [`&:before`]: {
        content: `''`,
        position: `absolute`,
        top: size / 2,
        left: size / 2,
        width: `2px`,
        height: `100%`,
        backgroundColor: inactiveColor,
      },
    }),
    activeSection: css({
      [`&:before`]: {
        background: activeColor,
      },
    }),
    validSection: css({
      [`&:before`]: {
        background: validColor,
      },
    }),
    invalidSection: css({
      [`&:before`]: {
        background: invalidColor,
      },
    }),
    indicator: css({
      display: `flex`,
      alignItems: `center`,
      justifyContent: `center`,
      width: size,
      height: size,
      borderRadius: `50%`,
      backgroundColor: inactiveColor,
      fontSize,
      transform: `translateY(-50%)`,
      top: `30px`,
      position: `relative`,
    }),
    activeIndicator: css({
      background: activeColor,
    }),
    validIndicator: css({
      background: validColor,
    }),
    invalidIndicator: css({
      background: invalidColor,
    }),
    content: css({
      maxWidth: `1440px`,
      flex: 1,
    }),
    stack: css({
      display: 'flex',
      gap: theme.spacing(2),
    }),
    collapseContent: css({
      display: 'grid',
      gridTemplateColumns: `1fr clamp(300px, 400px, 500px)`,
      gap: theme.spacing(4),
    }),
    supportingContent: css({
      position: `sticky`,
      top: theme.spacing(4),
    }),
  };
};

FormLayout.Section = FormSection;
