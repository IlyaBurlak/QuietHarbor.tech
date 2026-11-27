import { Rate } from 'antd';
import { PRIORITY_LABEL } from '../config/labels';

/** Приоритет желания звёздами (только показ). */
export function PriorityStars({ value }: { value: number }) {
  return (
    <span title={`Приоритет: ${PRIORITY_LABEL[value] ?? value}`}>
      <Rate disabled value={value} count={5} className="priority-stars" aria-label={`Приоритет ${value} из 5`} />
    </span>
  );
}
