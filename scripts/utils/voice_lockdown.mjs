/**
 * Archiview Voice Lockdown System (2026)
 * [절대 원칙] 모든 팟캐스트는 제임스(남)와 스텔라(여) 보이스만 사용합니다.
 * - Male (제임스): Puck — Index 짝수 (0, 2, 4...)
 * - Female (스텔라): Kore — Index 홀수 (1, 3, 5...)
 *
 * [주의] 보이스 이름은 이 파일에서만 관리합니다.
 * 다른 스크립트에서 직접 보이스 이름을 지정하지 마세요.
 */

export function getLockedVoice(unusedSpeakerName, index) {
    // 인덱스가 짝수면 남성(Puck), 홀수면 여성(Kore)을 반환하여
    // 대화의 일관성을 100% 보장합니다.
    return (index % 2 === 0) ? 'Puck' : 'Kore';
}

export const VOICES = {
    male: 'Puck',
    female: 'Kore'
};
