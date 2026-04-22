interface Step {
    id: number;
    title: string;
    description?: string;
}
interface StepperProps {
    steps: Step[];
    currentStep: number;
    className?: string;
}
export declare function Stepper({ steps, currentStep, className }: StepperProps): import("react").JSX.Element;
export {};
