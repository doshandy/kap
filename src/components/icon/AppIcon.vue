<script setup lang="ts">
/**
 * 统一封装 Ant Design Icons，避免每个使用点都 import。
 * 对没有合适 antd icon 的位置（如 emoji 表情），保留原 emoji 即可。
 */
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BulbFilled,
  BulbOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  CloseOutlined,
  CodeOutlined,
  CompassOutlined,
  CopyOutlined,
  DashboardOutlined,
  DeleteOutlined,
  DeploymentUnitOutlined,
  DownloadOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  GithubOutlined,
  LinkOutlined,
  PauseCircleOutlined,
  PieChartOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  ReloadOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  ShareAltOutlined,
  SoundOutlined,
  StarOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
  UploadOutlined,
  WarningOutlined,
  PushpinOutlined,
  StopOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons-vue';

const map = {
  appstore: AppstoreOutlined,
  arrowLeft: ArrowLeftOutlined,
  arrowRight: ArrowRightOutlined,
  calendar: CalendarOutlined,
  checkCircle: CheckCircleOutlined,
  clear: ClearOutlined,
  close: CloseOutlined,
  code: CodeOutlined,
  compass: CompassOutlined,
  copy: CopyOutlined,
  dashboard: DashboardOutlined,
  delete: DeleteOutlined,
  deployment: DeploymentUnitOutlined,
  download: DownloadOutlined,
  edit: EditOutlined,
  experiment: ExperimentOutlined,
  fileText: FileTextOutlined,
  folderOpen: FolderOpenOutlined,
  github: GithubOutlined,
  link: LinkOutlined,
  list: UnorderedListOutlined,
  moon: BulbFilled,
  pause: PauseCircleOutlined,
  pieChart: PieChartOutlined,
  play: PlayCircleOutlined,
  question: QuestionCircleOutlined,
  read: ReadOutlined,
  reload: ReloadOutlined,
  robot: RobotOutlined,
  search: SearchOutlined,
  setting: SettingOutlined,
  share: ShareAltOutlined,
  sound: SoundOutlined,
  star: StarOutlined,
  sun: BulbOutlined,
  thunderbolt: ThunderboltOutlined,
  trophy: TrophyOutlined,
  upload: UploadOutlined,
  warning: WarningOutlined,
  bookmark: PushpinOutlined,
  skip: StopOutlined,
  clock: ClockCircleOutlined,
} as const;

export type IconName = keyof typeof map;

defineProps<{ name: IconName }>();
</script>

<template>
  <component :is="map[name]" class="app-icon" />
</template>

<style scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  font-size: inherit;
  vertical-align: -0.125em;
}
</style>
